const { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar } = require("@hashgraph/sdk");
require('dotenv').config();

async function main() {
    // Check if environment variables are set
    if (process.env.ACCOUNT_ID == null || process.env.PRIVATE_KEY == null) {
        throw new Error("Environment variables ACCOUNT_ID and PRIVATE_KEY must be present");
    }

    const myAccountId = process.env.ACCOUNT_ID;
    const myPrivateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);


    // Create our connection to the Hedera network
    const client = Client.forTestnet();
    client.setOperator(myAccountId, myPrivateKey);

    // Verify the account balance
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(myAccountId)
        .execute(client);

    console.log("The account balance is: " + accountBalance.hbars.toTinybars() + " tinybars.");

    process.exit();
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
