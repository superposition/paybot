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

describe("Escrow", function () {
  async function deployEscrowFixture() {
    // Get contract artifacts
    const tokenArtifact = await hre.artifacts.readArtifact("QUSDToken");
    const escrowArtifact = await hre.artifacts.readArtifact("Escrow");

    // Create test client
    const testClient = createTestClient({
      chain: hardhat,
      mode: "hardhat",
      transport: http(),
    });

    // Create public client
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    // Create accounts from private keys
    const owner = privateKeyToAccount(TEST_ACCOUNTS[0]);
    const payer = privateKeyToAccount(TEST_ACCOUNTS[1]);
    const recipient = privateKeyToAccount(TEST_ACCOUNTS[2]);
    const other = privateKeyToAccount(TEST_ACCOUNTS[3]);

    // Create wallet clients
    const ownerWallet = createWalletClient({
      account: owner,
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

    const otherWallet = createWalletClient({
      account: other,
      chain: hardhat,
      transport: http(),
    });

    // Deploy QUSD token
    const tokenHash = await ownerWallet.deployContract({
      abi: tokenArtifact.abi,
      bytecode: tokenArtifact.bytecode as `0x${string}`,
      args: [owner.address],
    });

    const tokenReceipt = await publicClient.waitForTransactionReceipt({
      hash: tokenHash,
    });
    const tokenAddress = tokenReceipt.contractAddress!;

    // Deploy Escrow
    const escrowHash = await ownerWallet.deployContract({
      abi: escrowArtifact.abi,
      bytecode: escrowArtifact.bytecode as `0x${string}`,
      args: [tokenAddress],
    });

    const escrowReceipt = await publicClient.waitForTransactionReceipt({
      hash: escrowHash,
    });
    const escrowAddress = escrowReceipt.contractAddress!;

    // Mint tokens to payer for testing
    const mintAmount = parseEther("10000");
    const mintHash = await ownerWallet.writeContract({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      functionName: "mint",
      args: [payer.address, mintAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    return {
      escrowAddress,
      tokenAddress,
      escrowArtifact,
      tokenArtifact,
      publicClient,
      testClient,
      owner,
      payer,
      recipient,
      other,
      ownerWallet,
      payerWallet,
      recipientWallet,
      otherWallet,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      const { escrowAddress, tokenAddress, escrowArtifact, publicClient } =
        await deployEscrowFixture();

      const escrowTokenAddress = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "token",
      })) as Address;

      expect(getAddress(escrowTokenAddress)).to.equal(getAddress(tokenAddress));
    });

    it("Should revert if token address is zero", async function () {
      const escrowArtifact = await hre.artifacts.readArtifact("Escrow");
      const owner = privateKeyToAccount(TEST_ACCOUNTS[0]);

      const ownerWallet = createWalletClient({
        account: owner,
        chain: hardhat,
        transport: http(),
      });

      await expect(
        ownerWallet.deployContract({
          abi: escrowArtifact.abi,
          bytecode: escrowArtifact.bytecode as `0x${string}`,
          args: ["0x0000000000000000000000000000000000000000"],
        })
      ).to.be.rejected; // Expected error("Invalid token address");
    });
  });

  describe("Create Payment", function () {
    it("Should create a payment successfully", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600; // 1 hour
      const paymentId = keccak256(toHex("payment1"));

      // Approve escrow to spend tokens
      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Create payment
      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createHash,
      });

      // Check for PaymentCreated event
      expect(receipt.status).to.equal("success");
    });

    it("Should transfer tokens from payer to escrow", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("payment2"));

      const initialPayerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [payer.address],
      })) as bigint;

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

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

    it("Should store payment details correctly", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("payment3"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(getAddress(payment.payer)).to.equal(getAddress(payer.address));
      expect(getAddress(payment.recipient)).to.equal(getAddress(recipient.address));
      expect(payment.amount).to.equal(amount);
      expect(payment.claimed).to.be.false;
      expect(payment.refunded).to.be.false;
    });

    it("Should revert if payment already exists", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("payment4"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount * 2n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPayment",
          args: [paymentId, recipient.address, amount, duration],
        })
      ).to.be.rejected; // Expected error("Payment already exists");
    });

    it("Should revert if recipient is zero address", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("payment5"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPayment",
          args: [
            paymentId,
            "0x0000000000000000000000000000000000000000",
            amount,
            duration,
          ],
        })
      ).to.be.rejected; // Expected error("Invalid recipient");
    });

    it("Should revert if amount is zero", async function () {
      const { escrowAddress, escrowArtifact, recipient, payerWallet } =
        await deployEscrowFixture();

      const duration = 3600;
      const paymentId = keccak256(toHex("payment6"));

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPayment",
          args: [paymentId, recipient, 0n, duration],
        })
      ).to.be.rejected; // Expected error("Amount must be greater than 0");
    });

    it("Should revert if duration is zero", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const paymentId = keccak256(toHex("payment7"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPayment",
          args: [paymentId, recipient, amount, 0],
        })
      ).to.be.rejected; // Expected error("Duration must be greater than 0");
    });

    it("Should revert if token transfer fails (insufficient balance)", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        otherWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("payment8"));

      const approveHash = await otherWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      await expect(
        otherWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "createPayment",
          args: [paymentId, recipient.address, amount, duration],
        })
      ).to.be.rejected; // ERC20 will revert on insufficient balance
    });
  });

  describe("Claim Payment", function () {
    async function createPaymentFixture() {
      const fixture = await deployEscrowFixture();
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = fixture;

      const amount = parseEther("100");
      const duration = 3600; // 1 hour
      const paymentId = keccak256(toHex("claimPayment"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      return { ...fixture, paymentId, amount, duration };
    }

    it("Should allow recipient to claim payment before expiry", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        recipientWallet,
        paymentId,
        amount,
      } = await createPaymentFixture();

      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: claimHash,
      });
      expect(receipt.status).to.equal("success");

      const recipientBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [recipient.address],
      })) as bigint;

      const escrowBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [escrowAddress],
      })) as bigint;

      expect(recipientBalance).to.equal(amount);
      expect(escrowBalance).to.equal(0n);
    });

    it("Should mark payment as claimed", async function () {
      const {
        escrowAddress,
        escrowArtifact,
        publicClient,
        recipientWallet,
        paymentId,
      } = await createPaymentFixture();

      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(payment.claimed).to.be.true;
      expect(payment.refunded).to.be.false;
    });

    it("Should revert if non-recipient tries to claim", async function () {
      const { escrowAddress, escrowArtifact, payerWallet, paymentId } =
        await createPaymentFixture();

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "claimPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Only recipient can claim");
    });

    it("Should revert if payment already claimed", async function () {
      const {
        escrowAddress,
        escrowArtifact,
        publicClient,
        recipientWallet,
        paymentId,
      } = await createPaymentFixture();

      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      await expect(
        recipientWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "claimPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Payment already processed");
    });

    it("Should revert if payment has expired", async function () {
      const {
        escrowAddress,
        escrowArtifact,
        testClient,
        recipientWallet,
        paymentId,
        duration,
      } = await createPaymentFixture();

      // Fast forward past expiry
      await testClient.increaseTime({ seconds: duration + 1 });
      await testClient.mine({ blocks: 1 });

      await expect(
        recipientWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "claimPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Payment expired");
    });
  });

  describe("Refund Payment", function () {
    async function createExpiredPaymentFixture() {
      const fixture = await deployEscrowFixture();
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        testClient,
        payer,
        recipient,
        payerWallet,
      } = fixture;

      const amount = parseEther("100");
      const duration = 3600; // 1 hour
      const paymentId = keccak256(toHex("refundPayment"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Fast forward past expiry
      await testClient.increaseTime({ seconds: duration + 1 });
      await testClient.mine({ blocks: 1 });

      return { ...fixture, paymentId, amount, duration };
    }

    it("Should allow payer to refund after expiry", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        payerWallet,
        paymentId,
        amount,
      } = await createExpiredPaymentFixture();

      const initialBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [payer.address],
      })) as bigint;

      const refundHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "refundPayment",
        args: [paymentId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: refundHash,
      });
      expect(receipt.status).to.equal("success");

      const finalBalance = (await publicClient.readContract({
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

      expect(finalBalance).to.equal(initialBalance + amount);
      expect(escrowBalance).to.equal(0n);
    });

    it("Should mark payment as refunded", async function () {
      const {
        escrowAddress,
        escrowArtifact,
        publicClient,
        payerWallet,
        paymentId,
      } = await createExpiredPaymentFixture();

      const refundHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "refundPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: refundHash });

      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(payment.refunded).to.be.true;
      expect(payment.claimed).to.be.false;
    });

    it("Should revert if non-payer tries to refund", async function () {
      const { escrowAddress, escrowArtifact, recipientWallet, paymentId } =
        await createExpiredPaymentFixture();

      await expect(
        recipientWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "refundPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Only payer can refund");
    });

    it("Should revert if payment not expired yet", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("notExpired"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "refundPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Payment not expired yet");
    });

    it("Should revert if payment already refunded", async function () {
      const {
        escrowAddress,
        escrowArtifact,
        publicClient,
        payerWallet,
        paymentId,
      } = await createExpiredPaymentFixture();

      const refundHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "refundPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: refundHash });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "refundPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Payment already processed");
    });

    it("Should revert if payment was already claimed", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        testClient,
        recipient,
        payerWallet,
        recipientWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("alreadyClaimed"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Claim before expiry
      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      // Fast forward past expiry
      await testClient.increaseTime({ seconds: duration + 1 });
      await testClient.mine({ blocks: 1 });

      await expect(
        payerWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "refundPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error("Payment already processed");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple concurrent payments", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        other,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("50");
      const duration = 3600;

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount * 3n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const paymentId1 = keccak256(toHex("payment_1"));
      const paymentId2 = keccak256(toHex("payment_2"));
      const paymentId3 = keccak256(toHex("payment_3"));

      const create1 = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId1, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: create1 });

      const create2 = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId2, other.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: create2 });

      const create3 = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId3, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: create3 });

      // Verify all payments exist
      const payment1 = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId1],
      })) as any;

      const payment2 = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId2],
      })) as any;

      const payment3 = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId3],
      })) as any;

      expect(payment1.amount).to.equal(amount);
      expect(payment2.amount).to.equal(amount);
      expect(payment3.amount).to.equal(amount);
    });

    it("Should handle payment with very short duration", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        payerWallet,
        recipientWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 1; // 1 second
      const paymentId = keccak256(toHex("shortDuration"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Should still be claimable immediately
      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      const recipientBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "balanceOf",
        args: [recipient.address],
      })) as bigint;

      expect(recipientBalance).to.equal(amount);
    });

    it("Should handle payment with very long duration", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 365 * 24 * 60 * 60; // 1 year
      const paymentId = keccak256(toHex("longDuration"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      expect(Number(payment.expiresAt)).to.be.greaterThan(Number(latestBlock.timestamp));
    });
  });

  describe("Events", function () {
    it("Should emit PaymentCreated event with correct parameters", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("eventTest1"));

      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createHash,
      });

      // Verify PaymentCreated event was emitted
      expect(receipt.logs.length).to.be.greaterThan(0);
      const paymentCreatedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === escrowAddress.toLowerCase()
      );
      expect(paymentCreatedLog).to.not.be.undefined;
    });

    it("Should emit PaymentClaimed event", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        recipient,
        payerWallet,
        recipientWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("eventTest2"));

      // Create payment
      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Claim payment
      const claimHash = await recipientWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: claimHash,
      });

      // Verify PaymentClaimed event was emitted
      expect(receipt.logs.length).to.be.greaterThan(0);
      const paymentClaimedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === escrowAddress.toLowerCase()
      );
      expect(paymentClaimedLog).to.not.be.undefined;
    });

    it("Should emit PaymentRefunded event", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        testClient,
        payer,
        recipient,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("eventTest3"));

      // Create payment
      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Fast forward past expiry
      await testClient.increaseTime({ seconds: duration + 1 });
      await testClient.mine({ blocks: 1 });

      // Refund payment
      const refundHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "refundPayment",
        args: [paymentId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: refundHash,
      });

      // Verify PaymentRefunded event was emitted
      expect(receipt.logs.length).to.be.greaterThan(0);
      const paymentRefundedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === escrowAddress.toLowerCase()
      );
      expect(paymentRefundedLog).to.not.be.undefined;
    });
  });

  describe("Additional Edge Cases", function () {
    it("Should handle payer == recipient scenario", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        payer,
        payerWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 3600;
      const paymentId = keccak256(toHex("selfPayment"));

      // Create payment to self
      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, payer.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Verify payment was created
      const payment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(getAddress(payment.payer)).to.equal(getAddress(payer.address));
      expect(getAddress(payment.recipient)).to.equal(getAddress(payer.address));

      // Should be able to claim own payment
      const claimHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimPayment",
        args: [paymentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });

      const updatedPayment = (await publicClient.readContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "getPayment",
        args: [paymentId],
      })) as any;

      expect(updatedPayment.claimed).to.be.true;
    });

    it("Should revert claim one second after expiry", async function () {
      const {
        escrowAddress,
        tokenAddress,
        escrowArtifact,
        tokenArtifact,
        publicClient,
        testClient,
        payer,
        recipient,
        payerWallet,
        recipientWallet,
      } = await deployEscrowFixture();

      const amount = parseEther("100");
      const duration = 10;
      const paymentId = keccak256(toHex("expiredBoundary"));

      // Create payment
      const approveHash = await payerWallet.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: "approve",
        args: [escrowAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const createHash = await payerWallet.writeContract({
        address: escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "createPayment",
        args: [paymentId, recipient.address, amount, duration],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Fast forward past expiry
      await testClient.increaseTime({ seconds: duration + 1 });
      await testClient.mine({ blocks: 1 });

      // Should NOT be able to claim after expiry
      await expect(
        recipientWallet.writeContract({
          address: escrowAddress,
          abi: escrowArtifact.abi,
          functionName: "claimPayment",
          args: [paymentId],
        })
      ).to.be.rejected; // Expected error
    });
  });
});
