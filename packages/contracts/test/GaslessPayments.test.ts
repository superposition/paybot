import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  createTestClient,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  getAddress,
  Address,
  keccak256,
  toHex,
  Hex,
  encodeAbiParameters,
  parseAbiParameters,
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

describe("Gasless Payments (EIP-2612 + EIP-712)", function () {
  async function deployContractsFixture() {
    // Get contract artifacts
    const tokenArtifact = await hre.artifacts.readArtifact("QUSDToken");
    const escrowArtifact = await hre.artifacts.readArtifact("Escrow");

    // Create clients
    const testClient = createTestClient({
      chain: hardhat,
      mode: "hardhat",
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    // Create accounts
    const deployer = privateKeyToAccount(TEST_ACCOUNTS[0]);
    const payer = privateKeyToAccount(TEST_ACCOUNTS[1]);
    const recipient = privateKeyToAccount(TEST_ACCOUNTS[2]);
    const facilitator = privateKeyToAccount(TEST_ACCOUNTS[3]);

    // Create wallet clients
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

    // Deploy QUSD token
    const tokenHash = await deployerWallet.deployContract({
      abi: tokenArtifact.abi,
      bytecode: tokenArtifact.bytecode as `0x${string}`,
      args: [deployer.address],
    });

    const tokenReceipt = await publicClient.waitForTransactionReceipt({
      hash: tokenHash,
    });
    const tokenAddress = tokenReceipt.contractAddress!;

    // Deploy Escrow
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

  // Helper to get EIP-712 domain for Escrow
  async function getEscrowDomain(escrowAddress: Address, chainId: bigint) {
    return {
      name: "X402 Escrow",
      version: "1",
      chainId: Number(chainId),
      verifyingContract: escrowAddress,
    };
  }

  // Helper to get EIP-712 domain for QUSD Token
  async function getTokenDomain(
    tokenAddress: Address,
    chainId: bigint,
    name: string
  ) {
    return {
      name,
      version: "1",
      chainId: Number(chainId),
      verifyingContract: tokenAddress,
    };
  }

  // Helper to sign EIP-2612 permit
  async function signPermit(
    tokenAddress: Address,
    tokenName: string,
    chainId: bigint,
    owner: ReturnType<typeof privateKeyToAccount>,
    spender: Address,
    value: bigint,
    nonce: bigint,
    deadline: bigint,
    walletClient: ReturnType<typeof createWalletClient>
  ) {
    const domain = await getTokenDomain(tokenAddress, chainId, tokenName);

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const values = {
      owner: owner.address,
      spender,
      value,
      nonce,
      deadline,
    };

    const signature = await walletClient.signTypedData({
      account: owner,
      domain,
      types,
      primaryType: "Permit",
      message: values,
    });

    // Split signature
    const r = signature.slice(0, 66) as Hex;
    const s = ("0x" + signature.slice(66, 130)) as Hex;
    const v = parseInt(signature.slice(130, 132), 16);

    return { v, r, s };
  }

  // Helper to sign PaymentIntent (EIP-712)
  async function signPaymentIntent(
    escrowAddress: Address,
    chainId: bigint,
    payer: ReturnType<typeof privateKeyToAccount>,
    paymentId: Hex,
    recipient: Address,
    amount: bigint,
    duration: bigint,
    nonce: bigint,
    deadline: bigint,
    walletClient: ReturnType<typeof createWalletClient>
  ) {
    const domain = await getEscrowDomain(escrowAddress, chainId);

    const types = {
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

    const values = {
      paymentId,
      payer: payer.address,
      recipient,
      amount,
      duration,
      nonce,
      deadline,
    };

    const signature = await walletClient.signTypedData({
      account: payer,
      domain,
      types,
      primaryType: "PaymentIntent",
      message: values,
    });

    // Split signature
    const r = signature.slice(0, 66) as Hex;
    const s = ("0x" + signature.slice(66, 130)) as Hex;
    const v = parseInt(signature.slice(130, 132), 16);

    return { v, r, s };
  }

  describe("EIP-712 Domain Separator", function () {
    it("Should have correct domain separator", async function () {
      const { escrowAddress, escrowArtifact, publicClient } =
        await deployContractsFixture();

      const domainSeparator = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "DOMAIN_SEPARATOR",
      })) as Hex;

      expect(domainSeparator).to.not.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Should have correct payment intent typehash", async function () {
      const { escrowAddress, escrowArtifact, publicClient } =
        await deployContractsFixture();

      const typehash = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "PAYMENT_INTENT_TYPEHASH",
      })) as Hex;

      const expected = keccak256(
        toHex(
          "PaymentIntent(bytes32 paymentId,address payer,address recipient,uint256 amount,uint256 duration,uint256 nonce,uint256 deadline)"
        )
      );

      expect(typehash).to.equal(expected);
    });
  });

  describe("Nonce Management", function () {
    it("Should start with nonce 0", async function () {
      const { escrowAddress, escrowArtifact, publicClient, payer } =
        await deployContractsFixture();

      const nonce = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      expect(nonce).to.equal(0n);
    });

    it("Should increment nonce after gasless payment", async function () {
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

      const paymentId = keccak256(toHex("payment1"));
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

      expect(escrowNonce).to.equal(0n);

      // Sign permit
      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      const permitSig = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      // Sign payment intent
      const paymentSig = await signPaymentIntent(
        escrowAddress,
        chainId,
        payer,
        paymentId,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        payerWallet
      );

      // Facilitator creates payment
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
          paymentSig.v,
          paymentSig.r,
          paymentSig.s,
          permitSig.v,
          permitSig.r,
          permitSig.s,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const newNonce = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "nonces",
        args: [payer.address],
      })) as bigint;

      expect(newNonce).to.equal(1n);
    });
  });

  describe("createPaymentWithPermit", function () {
    it("Should create gasless payment successfully", async function () {
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

      const paymentId = keccak256(toHex("payment1"));
      const amount = parseEther("100");
      const duration = 3600n;
      const chainId = BigInt(hardhat.id);
      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const deadline = latestBlock.timestamp + 3600n;

      const initialPayerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [payer.address],
      })) as bigint;

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

      const permitSig = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      // Sign payment intent
      const paymentSig = await signPaymentIntent(
        escrowAddress,
        chainId,
        payer,
        paymentId,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        payerWallet
      );

      // Facilitator creates payment
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
          paymentSig.v,
          paymentSig.r,
          paymentSig.s,
          permitSig.v,
          permitSig.r,
          permitSig.s,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createHash,
      });

      expect(receipt.status).to.equal("success");

      // Verify payment was created
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

      // Verify tokens were transferred
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
    });

    it("Should fail with invalid payment intent signature", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        payer,
        recipient,
        deployer,
        payerWallet,
        deployerWallet,
        facilitatorWallet,
      } = await deployContractsFixture();

      const paymentId = keccak256(toHex("payment2"));
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
        args: [deployer.address],
      })) as bigint;

      // Sign permit with payer
      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      const permitSig = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      // Sign payment intent with WRONG signer (deployer instead of payer)
      const wrongPaymentSig = await signPaymentIntent(
        escrowAddress,
        chainId,
        deployer,
        paymentId,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        deployerWallet
      );

      // Should fail
      await expect(
        facilitatorWallet.writeContract({
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
            wrongPaymentSig.v,
            wrongPaymentSig.r,
            wrongPaymentSig.s,
            permitSig.v,
            permitSig.r,
            permitSig.s,
          ],
        })
      ).to.be.rejected;
    });

    it("Should fail with expired signature", async function () {
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
      } = await deployContractsFixture();

      const paymentId = keccak256(toHex("payment3"));
      const amount = parseEther("100");
      const duration = 3600n;
      const chainId = BigInt(hardhat.id);
      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const deadline = latestBlock.timestamp - 1n; // Expired

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

      const permitSig = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      // Sign payment intent
      const paymentSig = await signPaymentIntent(
        escrowAddress,
        chainId,
        payer,
        paymentId,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        payerWallet
      );

      // Should fail
      await expect(
        facilitatorWallet.writeContract({
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
            paymentSig.v,
            paymentSig.r,
            paymentSig.s,
            permitSig.v,
            permitSig.r,
            permitSig.s,
          ],
        })
      ).to.be.rejected;
    });

    it("Should prevent replay attacks with nonce", async function () {
      const {
        tokenAddress,
        escrowAddress,
        tokenArtifact,
        escrowArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
        facilitatorWallet,
      } = await deployContractsFixture();

      const paymentId1 = keccak256(toHex("payment4"));
      const paymentId2 = keccak256(toHex("payment5"));
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

      // Sign permit and payment intent for first payment
      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      const permitSig1 = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      const paymentSig1 = await signPaymentIntent(
        escrowAddress,
        chainId,
        payer,
        paymentId1,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        payerWallet
      );

      // First payment succeeds
      const createHash1 = await facilitatorWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPaymentWithPermit",
        args: [
          paymentId1,
          payer.address,
          recipient.address,
          amount,
          duration,
          deadline,
          paymentSig1.v,
          paymentSig1.r,
          paymentSig1.s,
          permitSig1.v,
          permitSig1.r,
          permitSig1.s,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: createHash1 });

      // Try to reuse same payment signature with different payment ID (should fail)
      await expect(
        facilitatorWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPaymentWithPermit",
          args: [
            paymentId2, // Different payment ID
            payer.address,
            recipient.address,
            amount,
            duration,
            deadline,
            paymentSig1.v, // Same signature (old nonce)
            paymentSig1.r,
            paymentSig1.s,
            permitSig1.v,
            permitSig1.r,
            permitSig1.s,
          ],
        })
      ).to.be.rejected;
    });
  });

  describe("Gas Cost Comparison", function () {
    it("Facilitator pays gas, not user", async function () {
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

      const paymentId = keccak256(toHex("payment6"));
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

      // Sign permit and payment intent
      const tokenName = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "name",
      })) as string;

      const permitSig = await signPermit(
        tokenAddress,
        tokenName,
        chainId,
        payer,
        escrowAddress,
        amount,
        payerNonce,
        deadline,
        payerWallet
      );

      const paymentSig = await signPaymentIntent(
        escrowAddress,
        chainId,
        payer,
        paymentId,
        recipient.address,
        amount,
        duration,
        escrowNonce,
        deadline,
        payerWallet
      );

      const facilitatorBalanceBefore = await publicClient.getBalance({
        address: facilitator.address,
      });
      const payerBalanceBefore = await publicClient.getBalance({
        address: payer.address,
      });

      // Facilitator submits transaction
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
          paymentSig.v,
          paymentSig.r,
          paymentSig.s,
          permitSig.v,
          permitSig.r,
          permitSig.s,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createHash,
      });

      const facilitatorBalanceAfter = await publicClient.getBalance({
        address: facilitator.address,
      });
      const payerBalanceAfter = await publicClient.getBalance({
        address: payer.address,
      });

      // Facilitator paid gas (balance decreased)
      expect(facilitatorBalanceAfter < facilitatorBalanceBefore).to.be.true;

      // Payer paid no gas (balance unchanged - only tokens transferred)
      expect(payerBalanceAfter).to.equal(payerBalanceBefore);
    });
  });
});
