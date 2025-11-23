import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  createTestClient,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  getAddress,
  keccak256,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import hre from "hardhat";

use(chaiAsPromised);

// Hardhat default test accounts
const TEST_ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
] as const;

describe("X402 Protocol Integration", function () {
  async function deployContractsFixture() {
    const tokenArtifact = await hre.artifacts.readArtifact("QUSDToken");
    const escrowArtifact = await hre.artifacts.readArtifact("Escrow");

    const testClient = createTestClient({
      chain: hardhat,
      mode: "hardhat",
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    const deployer = privateKeyToAccount(TEST_ACCOUNTS[0]);
    const payer = privateKeyToAccount(TEST_ACCOUNTS[1]);
    const recipient = privateKeyToAccount(TEST_ACCOUNTS[2]);
    const facilitator = privateKeyToAccount(TEST_ACCOUNTS[3]);

    const deployerWallet = createWalletClient({
      account: deployer,
      chain: hardhat,
      transport: http(),
    });

    const payerWallet = createWalletClient({
      account: payer,
      chain: hardhat,
      transport: http(),
    });

    const recipientWallet = createWalletClient({
      account: recipient,
      chain: hardhat,
      transport: http(),
    });

    const facilitatorWallet = createWalletClient({
      account: facilitator,
      chain: hardhat,
      transport: http(),
    });

    // Deploy contracts
    const tokenHash = await deployerWallet.deployContract({
      abi: tokenArtifact.abi,
      bytecode: tokenArtifact.bytecode as `0x${string}`,
      args: [deployer.address],
    });

    const tokenReceipt = await publicClient.waitForTransactionReceipt({
      hash: tokenHash,
    });
    const tokenAddress = tokenReceipt.contractAddress!;

    const escrowHash = await deployerWallet.deployContract({
      abi: escrowArtifact.abi,
      bytecode: escrowArtifact.bytecode as `0x${string}`,
      args: [tokenAddress],
    });

    const escrowReceipt = await publicClient.waitForTransactionReceipt({
      hash: escrowHash,
    });
    const escrowAddress = escrowReceipt.contractAddress!;

    // Mint tokens to payer
    const mintAmount = parseEther("10000");
    const mintHash = await deployerWallet.writeContract({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      functionName: "mint",
      args: [payer.address, mintAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    return {
      tokenAddress,
      escrowAddress,
      tokenArtifact,
      escrowArtifact,
      publicClient,
      testClient,
      deployer,
      payer,
      recipient,
      facilitator,
      deployerWallet,
      payerWallet,
      recipientWallet,
      facilitatorWallet,
    };
  }

  describe("Payment Payload Creation", function () {
    it("Should create valid payment payload with signatures", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = await deployContractsFixture();

      const paymentId = keccak256(toHex("x402-test-payment"));
      const amount = parseEther("100");
      const duration = 3600n;
      const chainId = BigInt(hardhat.id);
      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const deadline = latestBlock.timestamp + 3600n;

      // Get nonces
      const payerNonce = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      const escrowNonce = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      // Sign permit
      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      const permitDomain = {
        name: tokenName,
        version: "1",
        chainId: Number(chainId),
        verifyingContract: tokenAddress,
      };

      const permitTypes = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const permitSignature = await payerWallet.signTypedData({
        account: payer,
        domain: permitDomain,
        types: permitTypes,
        primaryType: "Permit",
        message: {
          owner: payer.address,
          spender: escrowAddress,
          value: amount,
          nonce: payerNonce,
          deadline,
        },
      });

      const permitR = permitSignature.slice(0, 66) as Hex;
      const permitS = ("0x" + permitSignature.slice(66, 130)) as Hex;
      const permitV = parseInt(permitSignature.slice(130, 132), 16);

      // Sign payment intent
      const paymentDomain = {
        name: "X402 Escrow",
        version: "1",
        chainId: Number(chainId),
        verifyingContract: escrowAddress,
      };

      const paymentTypes = {
        PaymentIntent: [
          { name: "paymentId", type: "bytes32" },
          { name: "payer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const paymentSignature = await payerWallet.signTypedData({
        account: payer,
        domain: paymentDomain,
        types: paymentTypes,
        primaryType: "PaymentIntent",
        message: {
          paymentId,
          payer: payer.address,
          recipient: recipient.address,
          amount,
          duration,
          nonce: escrowNonce,
          deadline,
        },
      });

      const paymentR = paymentSignature.slice(0, 66) as Hex;
      const paymentS = ("0x" + paymentSignature.slice(66, 130)) as Hex;
      const paymentV = parseInt(paymentSignature.slice(130, 132), 16);

      // Create X402 payload
      const x402Payload = {
        x402Version: 1,
        scheme: "evm-permit",
        network: "localhost",
        payload: {
          paymentId,
          payer: payer.address,
          recipient: recipient.address,
          amount: amount.toString(),
          duration: Number(duration),
          deadline: deadline.toString(),
          nonce: escrowNonce.toString(),
          permitSignature: {
            v: permitV,
            r: permitR,
            s: permitS,
          },
          paymentSignature: {
            v: paymentV,
            r: paymentR,
            s: paymentS,
          },
        },
      };

      // Verify payload structure
      expect(x402Payload.x402Version).to.equal(1);
      expect(x402Payload.scheme).to.equal("evm-permit");
      expect(x402Payload.payload.paymentId).to.equal(paymentId);
      expect(x402Payload.payload.payer).to.equal(payer.address);
      expect(x402Payload.payload.recipient).to.equal(recipient.address);
      expect(x402Payload.payload.permitSignature.v).to.be.a("number");
      expect(x402Payload.payload.paymentSignature.v).to.be.a("number");
    });

    it("Should encode and decode payment payload correctly", async function () {
      const paymentId = keccak256(toHex("encode-test"));
      const payload = {
        x402Version: 1,
        scheme: "evm-permit" as const,
        network: "localhost",
        payload: {
          paymentId,
          payer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
          recipient: "0x0987654321098765432109876543210987654321" as `0x${string}`,
          amount: "100000000000000000000",
          duration: 3600,
          deadline: "1234567890",
          nonce: "0",
          permitSignature: {
            v: 27,
            r: "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
            s: "0x4321098765432109876543210987654321098765432109876543210987654321" as Hex,
          },
          paymentSignature: {
            v: 28,
            r: "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" as Hex,
            s: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba" as Hex,
          },
        },
      };

      const json = JSON.stringify(payload);
      const encoded = Buffer.from(json).toString("base64");
      const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

      expect(decoded.x402Version).to.equal(payload.x402Version);
      expect(decoded.scheme).to.equal(payload.scheme);
      expect(decoded.payload.paymentId).to.equal(payload.payload.paymentId);
      expect(decoded.payload.payer).to.equal(payload.payload.payer);
      expect(decoded.payload.recipient).to.equal(payload.payload.recipient);
    });
  });

  describe("End-to-End Payment Flow", function () {
    it("Should complete full X402 payment flow", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        payer,
        recipient,
        facilitator,
        payerWallet,
        facilitatorWallet,
        recipientWallet,
      } = await deployContractsFixture();

      // Step 1: Generate payment request
      const paymentId = keccak256(toHex("e2e-payment"));
      const amount = parseEther("100");
      const duration = 3600n;
      const chainId = BigInt(hardhat.id);
      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const deadline = latestBlock.timestamp + 3600n;

      // Step 2: Get initial balances
      const initialPayerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [payer.address],
      })) as bigint;

      const initialRecipientBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [recipient.address],
      })) as bigint;

      // Step 3: User signs payment (off-chain)
      const payerNonce = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      const escrowNonce = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      // Sign permit
      const permitDomain = {
        name: tokenName,
        version: "1",
        chainId: Number(chainId),
        verifyingContract: tokenAddress,
      };

      const permitSignature = await payerWallet.signTypedData({
        account: payer,
        domain: permitDomain,
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: {
          owner: payer.address,
          spender: escrowAddress,
          value: amount,
          nonce: payerNonce,
          deadline,
        },
      });

      const permitR = permitSignature.slice(0, 66) as Hex;
      const permitS = ("0x" + permitSignature.slice(66, 130)) as Hex;
      const permitV = parseInt(permitSignature.slice(130, 132), 16);

      // Sign payment intent
      const paymentDomain = {
        name: "X402 Escrow",
        version: "1",
        chainId: Number(chainId),
        verifyingContract: escrowAddress,
      };

      const paymentSignature = await payerWallet.signTypedData({
        account: payer,
        domain: paymentDomain,
        types: {
          PaymentIntent: [
            { name: "paymentId", type: "bytes32" },
            { name: "payer", type: "address" },
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "duration", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "PaymentIntent",
        message: {
          paymentId,
          payer: payer.address,
          recipient: recipient.address,
          amount,
          duration,
          nonce: escrowNonce,
          deadline,
        },
      });

      const paymentR = paymentSignature.slice(0, 66) as Hex;
      const paymentS = ("0x" + paymentSignature.slice(66, 130)) as Hex;
      const paymentV = parseInt(paymentSignature.slice(130, 132), 16);

      // Step 4: Facilitator settles payment (on-chain, pays gas)
      const settleTxHash = await facilitatorWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPaymentWithPermit",
        args: [
          paymentId,
          payer.address,
          recipient.address,
          amount,
          duration,
          deadline,
          paymentV,
          paymentR,
          paymentS,
          permitV,
          permitR,
          permitS,
        ],
      });

      const settleReceipt = await publicClient.waitForTransactionReceipt({
        hash: settleTxHash,
      });

      expect(settleReceipt.status).to.equal("success");

      // Step 5: Verify payment was created
      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(getAddress(payment.payer)).to.equal(getAddress(payer.address));
      expect(getAddress(payment.recipient)).to.equal(
        getAddress(recipient.address)
      );
      expect(payment.amount).to.equal(amount);
      expect(payment.claimed).to.be.false;
      expect(payment.refunded).to.be.false;

      // Step 6: Verify tokens were transferred to escrow
      const finalPayerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [payer.address],
      })) as bigint;

      const escrowBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [escrowAddress],
      })) as bigint;

      expect(finalPayerBalance).to.equal(initialPayerBalance - amount);
      expect(escrowBalance).to.equal(amount);

      // Step 7: Recipient claims payment
      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });

      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      // Step 8: Verify recipient received tokens
      const finalRecipientBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [recipient.address],
      })) as bigint;

      expect(finalRecipientBalance).to.equal(initialRecipientBalance + amount);

      // Verify payment is marked as claimed
      const finalPayment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(finalPayment.claimed).to.be.true;
    });

    it("Should handle multiple sequential payments", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        payer,
        recipient,
        facilitator,
        payerWallet,
        facilitatorWallet,
      } = await deployContractsFixture();

      const amount = parseEther("50");
      const duration = 3600n;
      const chainId = BigInt(hardhat.id);

      for (let i = 0; i < 3; i++) {
        const paymentId = keccak256(toHex(`sequential-payment-${i}`));
        const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
        const deadline = latestBlock.timestamp + 3600n;

        // Get nonces
        const payerNonce = (await publicClient.readContract({
          address: tokenAddress,
          abi: tokenArtifact.abi,
          functionName: "nonces",
          args: [payer.address],
        })) as bigint;

        const escrowNonce = (await publicClient.readContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "nonces",
          args: [payer.address],
        })) as bigint;

        const tokenName = (await publicClient.readContract({
          address: tokenAddress,
          abi: tokenArtifact.abi,
          functionName: "name",
        })) as string;

        // Sign permit
        const permitSignature = await payerWallet.signTypedData({
          account: payer,
          domain: {
            name: tokenName,
            version: "1",
            chainId: Number(chainId),
            verifyingContract: tokenAddress,
          },
          types: {
            Permit: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "Permit",
          message: {
            owner: payer.address,
            spender: escrowAddress,
            value: amount,
            nonce: payerNonce,
            deadline,
          },
        });

        const permitR = permitSignature.slice(0, 66) as Hex;
        const permitS = ("0x" + permitSignature.slice(66, 130)) as Hex;
        const permitV = parseInt(permitSignature.slice(130, 132), 16);

        // Sign payment intent
        const paymentSignature = await payerWallet.signTypedData({
          account: payer,
          domain: {
            name: "X402 Escrow",
            version: "1",
            chainId: Number(chainId),
            verifyingContract: escrowAddress,
          },
          types: {
            PaymentIntent: [
              { name: "paymentId", type: "bytes32" },
              { name: "payer", type: "address" },
              { name: "recipient", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "duration", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "PaymentIntent",
          message: {
            paymentId,
            payer: payer.address,
            recipient: recipient.address,
            amount,
            duration,
            nonce: escrowNonce,
            deadline,
          },
        });

        const paymentR = paymentSignature.slice(0, 66) as Hex;
        const paymentS = ("0x" + paymentSignature.slice(66, 130)) as Hex;
        const paymentV = parseInt(paymentSignature.slice(130, 132), 16);

        // Facilitator settles
        const txHash = await facilitatorWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPaymentWithPermit",
          args: [
            paymentId,
            payer.address,
            recipient.address,
            amount,
            duration,
            deadline,
            paymentV,
            paymentR,
            paymentS,
            permitV,
            permitR,
            permitS,
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Verify nonce incremented
        const newEscrowNonce = (await publicClient.readContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "nonces",
          args: [payer.address],
        })) as bigint;

        expect(newEscrowNonce).to.equal(BigInt(i + 1));
      }

      // Verify all 3 payments were created
      const escrowBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [escrowAddress],
      })) as bigint;

      expect(escrowBalance).to.equal(amount * 3n);
    });
  });

  describe("Payment Lifecycle", function () {
    it("Should track payment through complete lifecycle", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        testClient,
        payer,
        recipient,
        payerWallet,
        facilitatorWallet,
        recipientWallet,
      } = await deployContractsFixture();

      const paymentId = keccak256(toHex("lifecycle-test"));
      const amount = parseEther("100");
      const duration = 10n; // 10 seconds for testing
      const chainId = BigInt(hardhat.id);
      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const deadline = latestBlock.timestamp + 3600n;

      // Get nonces
      const payerNonce = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      const escrowNonce = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      // Sign permit
      const permitSignature = await payerWallet.signTypedData({
        account: payer,
        domain: {
          name: tokenName,
          version: "1",
          chainId: Number(chainId),
          verifyingContract: tokenAddress,
        },
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: {
          owner: payer.address,
          spender: escrowAddress,
          value: amount,
          nonce: payerNonce,
          deadline,
        },
      });

      const permitR = permitSignature.slice(0, 66) as Hex;
      const permitS = ("0x" + permitSignature.slice(66, 130)) as Hex;
      const permitV = parseInt(permitSignature.slice(130, 132), 16);

      // Sign payment intent
      const paymentSignature = await payerWallet.signTypedData({
        account: payer,
        domain: {
          name: "X402 Escrow",
          version: "1",
          chainId: Number(chainId),
          verifyingContract: escrowAddress,
        },
        types: {
          PaymentIntent: [
            { name: "paymentId", type: "bytes32" },
            { name: "payer", type: "address" },
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "duration", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "PaymentIntent",
        message: {
          paymentId,
          payer: payer.address,
          recipient: recipient.address,
          amount,
          duration,
          nonce: escrowNonce,
          deadline,
        },
      });

      const paymentR = paymentSignature.slice(0, 66) as Hex;
      const paymentS = ("0x" + paymentSignature.slice(66, 130)) as Hex;
      const paymentV = parseInt(paymentSignature.slice(130, 132), 16);

      // State 1: Payment created (PENDING)
      const createHash = await facilitatorWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPaymentWithPermit",
        args: [
          paymentId,
          payer.address,
          recipient.address,
          amount,
          duration,
          deadline,
          paymentV,
          paymentR,
          paymentS,
          permitV,
          permitR,
          permitS,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: createHash });

      let payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(payment.claimed).to.be.false;
      expect(payment.refunded).to.be.false;

      // State 2: Payment claimed (CLAIMED)
      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });

      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(payment.claimed).to.be.true;
      expect(payment.refunded).to.be.false;
    });
  });
});
