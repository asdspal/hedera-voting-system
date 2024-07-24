const {
    Client,
    PrivateKey,
    ContractExecuteTransaction,
    ContractCallQuery,
    Hbar,
} = require("@hashgraph/sdk");
require('dotenv').config();

const accountId = process.env.ACCOUNT_ID;
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const contractId = process.env.CONTRACT_ID; // Add this to your .env file

async function main() {
    // Create Hedera testnet client
    const client = Client.forTestnet().setOperator(accountId, privateKey);

    // Cast a vote
    async function castVote(candidateIndex) {
        const transaction = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("vote", new ContractFunctionParameters().addUint256(candidateIndex));

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        console.log(`Vote cast status: ${receipt.status}`);
    }

    // Get candidate information
    async function getCandidate(index) {
        const query = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getCandidate", new ContractFunctionParameters().addUint256(index))
            .setQueryPayment(new Hbar(2));

        const result = await query.execute(client);
        const [name, voteCount] = result.getString(0).split(',');
        console.log(`Candidate ${index}: ${name}, Votes: ${voteCount}`);
    }

    // Cast a vote for candidate 1
    await castVote(1);

    // Get information for all candidates
    const candidateCount = await new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getCandidateCount")
        .setQueryPayment(new Hbar(2))
        .execute(client);

    for (let i = 0; i < candidateCount.getUint256(0); i++) {
        await getCandidate(i);
    }

    process.exit();
}

main();
