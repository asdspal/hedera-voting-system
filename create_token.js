const {
    TokenCreateTransaction,
    Client,
    PrivateKey,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    AccountId,
} = require("@hashgraph/sdk");
require('dotenv').config();

const accountId = process.env.ACCOUNT_ID;
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

async function main() {
    // Create Hedera testnet client
    const client = Client.forTestnet().setOperator(accountId, privateKey);

    // Create the token
    let tokenCreateTx = await new TokenCreateTransaction()
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

    let tokenCreateSign = await tokenCreateTx.sign(privateKey);
    let tokenCreateSubmit = await tokenCreateSign.execute(client);
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    let tokenId = tokenCreateRx.tokenId;
    console.log(`Created token with ID: ${tokenId}`);

    // Mint tokens
    let mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from("Voter1"), Buffer.from("Voter2"), Buffer.from("Voter3")])
        .freezeWith(client);

    let mintSign = await mintTx.sign(privateKey);
    let mintSubmit = await mintSign.execute(client);
    let mintRx = await mintSubmit.getReceipt(client);
    console.log(`Minted ${mintRx.totalSupply} tokens`);

    process.exit();
}

main();
