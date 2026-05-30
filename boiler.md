Signup flow:

Get username and password from request body
Check if user already exists in DB
Hash the password with bcrypt
Save user to DB
Return success
Signin flow:

Get username and password
Find user in DB
Compare password with bcrypt
If valid → generate JWT token
Return token

1. Incoming Order arrives

Has: userId, market, side (buy/sell), qty, price, orderType (limit/market)
Check: does user have enough balance?
If yes: lock the margin
2. Look at opposite side

If incoming is buy → look at asks
If incoming is sell → look at bids
3. Find best price

For buy: find the lowest ask price
For sell: find the highest bid price
4. Check if prices match

For limit buy: incoming price must be ≥ best ask
For limit sell: incoming price must be ≤ best bid
For market: always matches (no price check)
5. Fill the order

matchQty = Math.min(incomingQty, restingQty)
Reduce both quantities
Create a fill record
If resting order fully filled → remove from orderbook
6. Repeat until:

Incoming order fully filled → done
No more matching orders → stop
7. After matching:

If qty remaining and limit order → add to orderbook
Update order status: open / partially_filled / filled

