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
] as const;

describe("QUSDToken", function () {
  async function deployTokenFixture() {
    // Get contract artifact
    const artifact = await hre.artifacts.readArtifact("QUSDToken");

    // Create test client (provides test-specific methods)
    const testClient = createTestClient({
      chain: hardhat,
      mode: "hardhat",
      transport: http(),
    });

    // Create public client (for reading blockchain state)
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    // Create accounts from private keys
    const owner = privateKeyToAccount(TEST_ACCOUNTS[0]);
    const addr1 = privateKeyToAccount(TEST_ACCOUNTS[1]);
    const addr2 = privateKeyToAccount(TEST_ACCOUNTS[2]);

    // Create wallet clients for each account
    const ownerWallet = createWalletClient({
      account: owner,
      chain: hardhat,
      transport: http(),
    });

    const addr1Wallet = createWalletClient({
      account: addr1,
      chain: hardhat,
      transport: http(),
    });

    const addr2Wallet = createWalletClient({
      account: addr2,
      chain: hardhat,
      transport: http(),
    });

    // Deploy contract
    const hash = await ownerWallet.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as `0x${string}`,
      args: [owner.address],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const tokenAddress = receipt.contractAddress!;

    return {
      tokenAddress,
      artifact,
      publicClient,
      testClient,
      owner,
      addr1,
      addr2,
      ownerWallet,
      addr1Wallet,
      addr2Wallet,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { tokenAddress, artifact, publicClient, owner} =
        await deployTokenFixture();

      const ownerAddress = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "owner",
      })) as Address;

      expect(getAddress(ownerAddress)).to.equal(getAddress(owner.address));
    });

    it("Should assign the total supply to the owner", async function () {
      const { tokenAddress, artifact, publicClient, owner } =
        await deployTokenFixture();

      const ownerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [owner.address],
      })) as bigint;

      const totalSupply = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "totalSupply",
      })) as bigint;

      expect(totalSupply).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      const { tokenAddress, artifact, publicClient } =
        await deployTokenFixture();

      const name = await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "name",
      });

      const symbol = await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "symbol",
      });

      expect(name).to.equal("Qualia USD");
      expect(symbol).to.equal("QUSD");
    });

    it("Should have 18 decimals", async function () {
      const { tokenAddress, artifact, publicClient } =
        await deployTokenFixture();

      const decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "decimals",
      });

      expect(decimals).to.equal(18);
    });

    it("Should mint initial supply of 1,000,000 QUSD", async function () {
      const { tokenAddress, artifact, publicClient, owner } =
        await deployTokenFixture();

      const expectedSupply = parseEther("1000000");
      const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [owner.address],
      })) as bigint;

      expect(balance).to.equal(expectedSupply);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint new tokens", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const mintAmount = parseEther("1000");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr1.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr1.address],
      })) as bigint;

      expect(balance).to.equal(mintAmount);
    });

    it("Should increase total supply when minting", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const initialSupply = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "totalSupply",
      })) as bigint;

      const mintAmount = parseEther("1000");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr1.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const newSupply = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "totalSupply",
      })) as bigint;

      expect(newSupply).to.equal(initialSupply + mintAmount);
    });

    it("Should revert when non-owner tries to mint", async function () {
      const { tokenAddress, artifact, addr1Wallet, addr2 } =
        await deployTokenFixture();

      const mintAmount = parseEther("1000");

      await expect(
        addr1Wallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "mint",
          args: [addr2.address, mintAmount],
        })
      ).to.be.rejected;
    });

    it("Should allow minting to multiple addresses", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1, addr2 } =
        await deployTokenFixture();

      const mintAmount = parseEther("500");

      const hash1 = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr1.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr2.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const balance1 = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr1.address],
      })) as bigint;

      const balance2 = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr2.address],
      })) as bigint;

      expect(balance1).to.equal(mintAmount);
      expect(balance2).to.equal(mintAmount);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const transferAmount = parseEther("100");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transfer",
        args: [addr1.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr1.address],
      })) as bigint;

      expect(balance).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { tokenAddress, artifact, addr1Wallet, owner } =
        await deployTokenFixture();

      await expect(
        addr1Wallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "transfer",
          args: [owner.address, parseEther("1")],
        })
      ).to.be.rejected;
    });

    it("Should update balances after transfers", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, owner, addr1, addr2 } =
        await deployTokenFixture();

      const initialOwnerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [owner.address],
      })) as bigint;

      const transferAmount = parseEther("100");

      const hash1 = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transfer",
        args: [addr1.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transfer",
        args: [addr2.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const finalOwnerBalance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [owner.address],
      })) as bigint;

      const balance1 = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr1.address],
      })) as bigint;

      const balance2 = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr2.address],
      })) as bigint;

      expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount * 2n);
      expect(balance1).to.equal(transferAmount);
      expect(balance2).to.equal(transferAmount);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, owner, addr1 } =
        await deployTokenFixture();

      const approveAmount = parseEther("100");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "approve",
        args: [addr1.address, approveAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const allowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "allowance",
        args: [owner.address, addr1.address],
      })) as bigint;

      expect(allowance).to.equal(approveAmount);
    });

    it("Should allow delegated transfer with allowance", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1Wallet, owner, addr2 } =
        await deployTokenFixture();

      const transferAmount = parseEther("50");

      const approveHash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "approve",
        args: [addr1Wallet.account.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const transferHash = await addr1Wallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transferFrom",
        args: [owner.address, addr2.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: transferHash });

      const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr2.address],
      })) as bigint;

      expect(balance).to.equal(transferAmount);
    });

    it("Should decrease allowance after transferFrom", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1Wallet, owner, addr2 } =
        await deployTokenFixture();

      const approveAmount = parseEther("100");
      const transferAmount = parseEther("50");

      const approveHash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "approve",
        args: [addr1Wallet.account.address, approveAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const transferHash = await addr1Wallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transferFrom",
        args: [owner.address, addr2.address, transferAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: transferHash });

      const allowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "allowance",
        args: [owner.address, addr1Wallet.account.address],
      })) as bigint;

      expect(allowance).to.equal(approveAmount - transferAmount);
    });

    it("Should revert transferFrom if allowance is insufficient", async function () {
      const { tokenAddress, artifact, addr1Wallet, owner, addr2 } =
        await deployTokenFixture();

      await expect(
        addr1Wallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "transferFrom",
          args: [owner.address, addr2.address, parseEther("1")],
        })
      ).to.be.rejected;
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transferOwnership",
        args: [addr1.address],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const newOwner = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "owner",
      })) as Address;

      expect(getAddress(newOwner)).to.equal(getAddress(addr1.address));
    });

    it("Should prevent non-owner from transferring ownership", async function () {
      const { tokenAddress, artifact, addr1Wallet, addr2 } =
        await deployTokenFixture();

      await expect(
        addr1Wallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "transferOwnership",
          args: [addr2.address],
        })
      ).to.be.rejected;
    });

    it("Should allow new owner to mint after ownership transfer", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1Wallet, addr2 } =
        await deployTokenFixture();

      const mintAmount = parseEther("1000");

      const transferHash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transferOwnership",
        args: [addr1Wallet.account.address],
      });

      await publicClient.waitForTransactionReceipt({ hash: transferHash });

      const mintHash = await addr1Wallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr2.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "balanceOf",
        args: [addr2.address],
      })) as bigint;

      expect(balance).to.equal(mintAmount);
    });
  });

  describe("Events", function () {
    it("Should emit Transfer event on mint", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const mintAmount = parseEther("1000");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "mint",
        args: [addr1.address, mintAmount],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check Transfer event was emitted
      expect(receipt.logs.length).to.be.greaterThan(0);
      const transferLog = receipt.logs[0];
      expect(transferLog.address.toLowerCase()).to.equal(tokenAddress.toLowerCase());
    });

    it("Should emit Transfer event on transfer", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const transferAmount = parseEther("100");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transfer",
        args: [addr1.address, transferAmount],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.logs.length).to.be.greaterThan(0);
      const transferLog = receipt.logs[0];
      expect(transferLog.address.toLowerCase()).to.equal(tokenAddress.toLowerCase());
    });

    it("Should emit Approval event on approve", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const approveAmount = parseEther("100");

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "approve",
        args: [addr1.address, approveAmount],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.logs.length).to.be.greaterThan(0);
      const approvalLog = receipt.logs[0];
      expect(approvalLog.address.toLowerCase()).to.equal(tokenAddress.toLowerCase());
    });

    it("Should emit OwnershipTransferred event on ownership transfer", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "transferOwnership",
        args: [addr1.address],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.logs.length).to.be.greaterThan(0);
      const ownershipLog = receipt.logs[0];
      expect(ownershipLog.address.toLowerCase()).to.equal(tokenAddress.toLowerCase());
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when minting to zero address", async function () {
      const { tokenAddress, artifact, ownerWallet } =
        await deployTokenFixture();

      const mintAmount = parseEther("1000");

      await expect(
        ownerWallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "mint",
          args: ["0x0000000000000000000000000000000000000000", mintAmount],
        })
      ).to.be.rejected;
    });

    it("Should allow owner to renounce ownership", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet } =
        await deployTokenFixture();

      const hash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "renounceOwnership",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const newOwner = (await publicClient.readContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "owner",
      })) as Address;

      expect(newOwner).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("Should prevent minting after renouncing ownership", async function () {
      const { tokenAddress, artifact, publicClient, ownerWallet, addr1 } =
        await deployTokenFixture();

      // Renounce ownership
      const renounceHash = await ownerWallet.writeContract({
        address: tokenAddress,
        abi: artifact.abi,
        functionName: "renounceOwnership",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: renounceHash });

      // Try to mint (should fail)
      const mintAmount = parseEther("1000");
      await expect(
        ownerWallet.writeContract({
          address: tokenAddress,
          abi: artifact.abi,
          functionName: "mint",
          args: [addr1.address, mintAmount],
        })
      ).to.be.rejected;
    });
  });
});
