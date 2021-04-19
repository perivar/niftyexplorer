To run any application in the applications/wallet directory, simply enter:
"npm start"
while in that folder directory (e.g. run "npm start" while in the
applications/wallet/create-wallet directory)

## Testnet
All of the .js files in the applications/wallet directory are set to the
"mainnet" network. For wallet testing purposes, by using the testnet network,
change the following line of code in EACH AND EVERY .js file in the
applications/wallet directories:

`const NETWORK = 'mainnet'`

should be changed to:

`const NETWORK = 'testnet'`

If you wish to fund your newly created **testnet** wallet,
you can go to the [testnet faucet](https://developer.bitcoin.com/faucets/nfy)
and enter your NFY testnet (tNFY) wallet address (please use the address located
in your "wallet.json" file, explained further on). You will receive a small amount
of tNFY to use for any testing purposes that you wish.
It is also good form to return any unused tNFY to the faucet, their wallet being:
nfytest:qqmd9unmhkpx4pkmr6fkrr8rm6y77vckjvqe8aey35

If you already have NFY, you can test these functions without having to change
any of the code from 'mainnet' to 'testnet'. A simple 1000 satoshi (0.00001
NFY) transaction is enough to fund the "wallet.json" address for testing transactions.


The following are steps to follow when using these .js files


## Create Wallet

The first action you should perform in the application/wallet directory
should be in the [create-wallet](create-wallet) example. Run using: `npm start`

A new `wallet-info.txt` and `wallet.json` file will be created for you.

*NOTE:*
Running `npm start` in this directory will overwrite any previous
`wallet-info.txt` and `wallet.json` files. **BE CAREFUL TO BACKUP THESE FILES.**

The `wallet.json` file will contain your 12-word mnemonic seed phrase for that wallet.
The `wallet.json` file will also contain your primary NFY wallet address.
The `wallet-info.txt` file goes a step further: while containing your mnemonic
seed phrase, it also contains 10 different NFY addresses you can use with your
single mnemonic. This demonstrates on how to generate multiple public/private key
pairs with a mnemonic.

*NOTE:*
All of the following examples use the `wallet.json` file (with the single
NFY address within) and not the full `wallet-info.txt` file of addresses.
The `wallet-info.txt` file is only an example of how to generate lots of
addresses with a single mnemonic. Only the `wallet.json` file will be used by
the other examples.


## Check Balance

Once you send NFY (or tNFY) to the address in your newly made `wallet.json`
wallet file, you can
use the [check-balance](check-balance) example, to update your wallet with the network to
confirm that the coins sent have successfully reached your wallet.

Again, run the example by running: `npm start`

This will show you the current balance
in the address in the `wallet.json` file.


## Send All

Once you have NFY (or tNFY) in your wallet, you can use the
[send-all](send-all) example to send ALL of the NFY in your wallet to a single address.

*NOTE:*
The .js file is initially set up to return all NFY to the SAME WALLET IT IS
BEING SENT FROM (which will perform a similar action to the
[consolidate-utxos](consolidate-utxos) example.
To change the send-all address, change the .js file line from:

`const receiverAddress = walletInfo.segwitAddress`

to

`const receiverAddress = "YourNFYwalletHereInQuotes"`


## SEND NFY

Once you have NFY (or tNFY) in your "wallet.json" address, you can use the function
wallet/send-nfy to send a specific amount of NFY from your "wallet.json" address
to any address of your choosing.
NOTE: the .js file has to be opened, and your receiving address has to be
changed from:
const receiverAddress = ``
to
const receiverAddress = 'YourNFYwalletHereInQuotes'
#NOTE:
the .js file is defaulted to sending 1000 niftoshis. Edit this line:
const NIFTOSHIS_TO_SEND = 1000
to any number you wish, above 546, to change the amount of niftoshis that will be
sent to the receiving address you entered above.


##applications/wallet/send-WIF

Exactly the same as the above 'wallet/send-nfy' function above, except it uses
the WIF (Wallet Import Format) in place of the mnemonic in the "wallet.json"
file to send the NFY. This is just another way of signing the transaction
as proof of ownership of the wallet and containing addresses.
NOTE: the .js file has to be opened, and your receiving address has to be
changed from:
const receiverAddress = ``
to
const receiverAddress = 'YourNFYwalletHereInQuotes'
NOTE: the .js file is defaulted to sending 1000 niftoshis. Edit this line:
const NIFTOSHIS_TO_SEND = 1000
to any number you wish, above 546 niftoshis, to send that amount of niftoshis
to the receiving address you entered above.


##applications/wallet/consolidate-utxos

After having multiple transactions into and out of your "wallet.json" address,
you may wish to combine all of the UTXOs into one single UTXO. This is done
using 'wallet/consolidate-utxo's, exactly similar as if you used "wallet/send-all"
to yourself in the above 'wallet/send-all' .js file. Doing this can combine
dozens of UTXOs into a single UTXO. Ran by running:
"npm start"


##applications/wallet/consolidate-dust

Similar to 'wallet/consolidate-utxos', however this .js file concerns itself
with satoshi amounts smaller than 546 niftoshis (the cut-off limit for "dust").
The transaction will happen if ALL of the COMBINED UTXOs have satoshi values
individually less than 546, but if combined together, are greater than 546
niftoshis. Should the total combined utxos not exceed 546 niftoshis in total,
then there will be an error message of "insufficient funds".

##applications/util.js

Simple script to log to the console the transaction ID on the NFY or tNFY blockchain
either
[NFY](https://explorer.bitcoin.com/nfy/tx/)
or
[tNFY](https://explorer.bitcoin.com/tnfy/tx)
depending on if in the .js files above has
NETWORK = 'mainnet'
or
NETWORK = 'testnet'
