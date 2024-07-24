const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractCallQuery,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TransferTransaction,
    Hbar,
    ContractFunctionParameters,
} = require("@hashgraph/sdk");
require('dotenv').config();

const accountId = process.env.ACCOUNT_ID;
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

async function main() {
    // Create Hedera testnet client
    const client = Client.forTestnet().setOperator(accountId, privateKey);

    // Step 1: Create voting tokens
    console.log("Creating voting tokens...");
    const tokenCreateTx = await new TokenCreateTransaction    // Step 1: Create voting tokens
    console.log("Creating voting tokens...");
    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("Vote Token")
        .setTokenSymbol("VOTE")
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(accountId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1000)
        .setSupplyKey(privateKey)
        .freezeWith(client);

    const tokenCreateSign = await tokenCreateTx.sign(privateKey);
    const tokenCreateSubmit = await tokenCreateSign.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log(`Created token with ID: ${tokenId}`);

    // Step 2: Mint voting tokens
    console.log("Minting voting tokens...");
    const mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from("Voter1"), Buffer.from("Voter2"), Buffer.from("Voter3")])
        .freezeWith(client);

    const mintSign = await mintTx.sign(privateKey);
    const mintSubmit = await mintSign.execute(client);
    const mintRx = await mintSubmit.getReceipt(client);
    console.log(`Minted ${mintRx.totalSupply} tokens`);

    // Step 3: Deploy the updated smart contract
    console.log("Deploying smart contract...");
    const contractBytecode = require('./VotingSystem.json').bytecode;
    const contractCreate = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(contractBytecode)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress(tokenId.toSolidityAddress())
                .addStringArray(["Candidate A", "Candidate B", "Candidate C"])
                .addUint256(60) // Voting duration: 60 minutes
        );

    const txResponse = await contractCreate.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const contractId = receipt.contractId;
    console.log("The new contract ID is " + contractId);

    // Step 4: Cast votes
    console.log("Casting votes...");
    async function castVote(candidateIndex, tokenId) {
        const transaction = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("vote", new ContractFunctionParameters()
                .addUint256(candidateIndex)
                .addUint256(tokenId));

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        console.log(`Vote cast status for token ${tokenId}: ${receipt.status}`);
    }

    // Cast votes for each token
    await castVote(0, 1); // Vote for Candidate A with token 1
    await castVote(1, 2); // Vote for Candidate B with token 2
    await castVote(2, 3); // Vote for Candidate C with token 3

    // Step 5: Retrieve and display results
    console.log("Retrieving voting results...");
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

    const candidateCount = await new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getCandidateCount")
        .setQueryPayment(new Hbar(2))
        .execute(client);

    for (let i = 0; i < candidateCount.getUint256(0); i++) {
        await getCandidate(i);
    }

    console.log("Voting system test completed successfully!");
    process.exit();
}

main().catch((error) => {
    console.error("Error in main:", error);
    process.exit(1);
});
