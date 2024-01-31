const express = require('express');
const app = express();
const port = 3000;
require('dotenv').config();
var async = require('async');

//some mock data
var tradable_assets = {
    'A': {
        current_share_price: 5.19
    },
    'B': {
        current_share_price: 21.45
    },
    'C': {
        current_share_price: 103.88
    }
}

var user = {
    1: {
        free_share_status: 'eligible'
    }, 
    2: {
        free_share_status: 'ineligible'
    }, 
    3: {
        free_share_status: 'claimed'
    }
}

var account_order = {
    1: [
        {id: '437834578', ticker_symbol: 'A', quantity: 1, side: 'buy', status: 'open', filled_price: 5.19}
    ], 
    2: [
        {id: '43534634', ticker_symbol: 'A', quantity: 1, side: 'buy', status: 'open', filled_price: 4.01},
        {id: '235235523', ticker_symbol: 'B', quantity: 2, side: 'buy', status: 'open', filled_price: 21.45}
    ], 
    3: [
        {id: '233252', ticker_symbol: 'A', quantity: 1, side: 'buy', status: 'open', filled_price: 0.43},
        {id: '2332095', ticker_symbol: 'B', quantity: 1, side: 'buy', status: 'open', filled_price: 21.45}, 
        {id: '4364554', ticker_symbol: 'B', quantity: 1, side: 'buy', status: 'open', filled_price: 24.01},
        {id: '4344343', ticker_symbol: 'C', quantity: 2, side: 'buy', status: 'open', filled_price: 110.20}
    ]
}

var account_positions = {
    1: {
        'A': 1
    }, 
    2: {
        'A': 1,
        'B': 1
    },
    3: {
        'A': 1,
        'B': 2,
        'C': 2
    }
}


//setters
function setUser(account_id, data) {
    user[account_id] = data;
}

function setTradeableAssets(data) {
    tradable_assets = data;
}

function setAccountOrders(account_id, orders_array) {
    account_order[account_id] = orders_array;
}

function setAccountPositions(account_id, share_data) {
    account_positions[account_id] = share_data;
}

//getters
function getUser(account_id) {
    return user[account_id];
}

function getAccountOrders(account_id) {
    return account_order[account_id];
}

function getAccountPositions(account_id) {
    return account_positions[account_id];
}


//mocked api functions
function listTradableAssets(callback) {
    callback(null, Object.keys(tradable_assets));
}

function isMarketOpen(callback) {
    callback(null, {
        open: process.env.MARKET_STATE == 'open' ? true : false, 
        next_opening_time: process.env.NEXTOPENINGTIME,
        next_closing_time: process.env.NEXTCLOSINGTIME
    });
}

function placeBuyOrderUsingEmmaFunds(account_id, ticker_symbol, quantity, callback) {
    let order_id = Math.floor(Math.random() * 10000);
    let order = {
        id: order_id,
        ticker_symbol: ticker_symbol, 
        quantity: quantity, 
        side: 'buy', 
        status: 'open', 
        filled_price: tradable_assets[ticker_symbol].current_share_price
    }
    account_order[account_id].push(order);
    if (account_positions[account_id].hasOwnProperty(ticker_symbol)) {
        account_positions[account_id][ticker_symbol] += quantity;
    } else {
        account_positions[account_id][ticker_symbol] = quantity;
    };
    user[account_id].free_share_status = 'claimed';
    callback(null, order_id);
}

function getAllOrders(account_id, callback) {
    callback(null, account_order[account_id]);
}

function getLatestPrice(ticker_symbol) {
    return tradable_assets[ticker_symbol].current_share_price;
}

function getRandomStock(callback) {
    const random_num = Math.random();
    let min, max;
    if (random_num < 0.95) {
        //assuming min share value will always be between 3 and 10 and at least one stock always exists in this given range
        min = process.env.MINSHAREVALUE;
        max = 10;
    } else if (random_num < 0.98) {
        min = 10;
        max = 25;
    } else {
        //assuming max share value will always be between 25 and 200 and at least one stock always exists in this given range
        min = 25;
        max = process.env.MAXSHAREVALUE;
    }

    listTradableAssets(function(err, tradable_assets_array) {
        if (err) throw err;
        let eligible_stocks = [];
        for (let i = 0; i < tradable_assets_array.length; i++) {
            let price = getLatestPrice(tradable_assets_array[i])
            if (price >= min && price <= max) eligible_stocks.push(tradable_assets_array[i]);
        }
        callback(null, eligible_stocks[(Math.floor(Math.random() * eligible_stocks.length))]);
    });
}

function claim_free_share(account_id, callback) {
    var result = {
        success: false,
        messages: [],
        free_stock_info: {}
    }
    //determine whether account is eligible for free share
    if (user[account_id].free_share_status !== 'eligible') {
        result.messages.push(user[account_id].free_share_status == 'claimed' ? 'User has already claimed a free share' : 'User is ineligible for a free share')
        return callback(result);
    }

    let ticker_symbol, order_id;
    async.series([
        function (_callback) {
            isMarketOpen(function(err, res) {
                if (err) throw err;
                if (!res.open) {
                    result.messages.push('The market is currently closed. The next opening time is ' + res.next_opening_time + ' and the next closing time is ' + res.next_closing_time + '. Please try again in between these times.');
                    return callback(result);
                }
                _callback();
            })
        },
        function (_callback) {
            getRandomStock(function(err, random_ticker_symbol) {
                if (err) throw err;
                ticker_symbol = random_ticker_symbol;
                _callback();
            });
        },
        function (_callback) {
            placeBuyOrderUsingEmmaFunds(account_id, ticker_symbol, 1, function(err, id) {
                if (err) throw err;
                order_id = id;
                _callback();
            });
        },
        function (_callback) {
            getAllOrders(account_id, function(err, account_orders) {
                if (err) throw err;
                let order_info;
                for (let i = 0; i < account_orders.length; i++) {
                    if (account_orders[i].id == order_id) {
                        order_info = account_orders[i];
                        break;
                    }
                }
                result.free_stock_info = {
                    ticker_symbol: order_info.ticker_symbol, 
                    quantity: order_info.quantity,
                    filled_price: order_info.filled_price
                }
                _callback();
            });
        }
    ], function (err, results) {
        if (err) throw err;
        result.success = true;
        callback(result);
    });
}

//the endpoint
app.use(express.json());
app.post('/claim-free-share', (req, res) => {
    claim_free_share(req.body.id, function(result) {
        res.send(result);
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

module.exports = {
    app,
    setUser, 
    setTradeableAssets, 
    setAccountOrders, 
    setAccountPositions,
    getUser,
    getAccountOrders,
    getAccountPositions
  };