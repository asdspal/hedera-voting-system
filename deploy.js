const {
    Client,
    PrivateKey,
    ContractCreateTransaction,
    ContractFunctionParameters,
    FileCreateTransaction,
    AccountBalanceQuery,
    Hbar,
} = require("@hashgraph/sdk");
const fs = require('fs');
require('dotenv').config();

const accountId = process.env.ACCOUNT_ID;
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

async function main() {
    // Create Hedera testnet client
    const client = Client.forTestnet();

    // Verify the client connection
    try {
        await client.ping();
        console.log("Client connection verified");
    } catch (err) {
        console.error("Error verifying client connection:", err);
        process.exit(1);
    }

    client.setOperator(accountId, privateKey);

    // Check account balance
    try {
        const balance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client);

        console.log(`Account balance: ${balance.hbars.toString()} HBAR`);

        if (balance.hbars.toTinybars() < 5_00_000_000) {
            console.error("Account balance too low. Please add more HBAR to your testnet account.");
            process.exit(1);
        }
    } catch (err) {
        console.error("Error checking account balance:", err);
        process.exit(1);
    }

    // Read the compiled contract bytecode
    let contractBytecode;
    try {
        const contractJson = JSON.parse(fs.readFileSync('VotingSystem.json', 'utf8'));
        contractBytecode = contractJson.data.bytecode.object;
        
        if (!contractBytecode) {
            console.error("Bytecode not found in the expected location in the JSON file");
            console.log("JSON structure:", JSON.stringify(contractJson, null, 2));
            process.exit(1);
        }

        console.log("Contract bytecode loaded successfully");
        console.log("Bytecode length:", contractBytecode.length);
    } catch (error) {
        console.error("Error reading contract bytecode:", error);
        process.exit(1);
    }

    // Create a file on Hedera and store the bytecode
    try {
        let fileCreateTx = await new FileCreateTransaction()
            .setContents(contractBytecode)
            .setKeys([privateKey])
            .freezeWith(client);
        let fileCreateSign = await fileCreateTx.sign(privateKey);
        let fileCreateSubmit = await fileCreateSign.execute(client);
        let fileCreateRx = await fileCreateSubmit.getReceipt(client);
        let bytecodeFileId = fileCreateRx.fileId;
        console.log(`- The bytecode file ID is: ${bytecodeFileId} \n`);

        // Instantiate the contract instance
        const contractTx = await new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(100000)
            .setConstructorParameters(
                new ContractFunctionParameters()
                    .addStringArray(["Candidate A", "Candidate B", "Candidate C"])
                    .addUint256(60) // Voting duration: 60 minutes
            );

        const contractResponse = await contractTx.execute(client);
        const contractReceipt = await contractResponse.getReceipt(client);
        const newContractId = contractReceipt.contractId;
        console.log("The smart contract ID is " + newContractId);
    } catch (err) {
        console.error("Error during contract deployment:", err);
        if (err.status) {
            console.error("Error status:", err.status.toString());
        }
    }

    process.exit();
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    console.error("Error details:", error.message);
    if (error.status) {
        console.error("Error status:", error.status.toString());
    }
    process.exit(1);
})
