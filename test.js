const chai = require('chai');
const chaiHttp = require('chai-http');
const {
    app, 
    setUser, 
    setTradeableAssets, 
    setAccountOrders, 
    setAccountPositions, 
    getUser, 
    getAccountOrders,
    getAccountPositions
} = require('./app');
const expect = chai.expect;
require('dotenv').config();

chai.use(chaiHttp);

describe('Express.js API Tests', () => {
  describe('POST /claim-free-share', () => {

    it('should handle ineligible user for a free share', (done) => {
        const id = 2;
        setUser(id, {free_share_status: 'ineligible'});
        chai.request(app)
            .post('/claim-free-share')
            .send({ id })
            .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('success').to.equal(false);
            expect(res.body).to.have.property('messages').to.include('User is ineligible for a free share');
            done();
            });
    });

    it('should handle user that has already claimed a free share', (done) => {
        const id = 3;
        setUser(id, {free_share_status: 'claimed'});
        chai.request(app)
            .post('/claim-free-share')
            .send({ id })
            .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('success').to.equal(false);
            expect(res.body).to.have.property('messages').to.include('User has already claimed a free share');
            done();
            });
    });

    it('should successfully claim a free share', (done) => {
        const id = 1;
        setUser(id, {free_share_status: 'eligible'});
        setTradeableAssets({
            'A': {
                current_share_price: 5.19
            },
            'B': {
                current_share_price: 21.45
            },
            'C': {
                current_share_price: 103.88
            }
        });
        setAccountOrders(id, [
            {id: '437834578', ticker_symbol: 'A', quantity: 1, side: 'buy', status: 'open', filled_price: 5.19},
            {id: '345345345', ticker_symbol: 'B', quantity: 2, side: 'buy', status: 'open', filled_price: 20.11}
        ]);
        setAccountPositions(id, {'A': 1, 'B': 2});
        chai.request(app)
            .post('/claim-free-share')
            .send({ id })
            .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('success').to.equal(true);
            expect(res.body).to.have.property('free_stock_info');
            expect(res.body.free_stock_info).to.have.property('ticker_symbol');
            expect(res.body.free_stock_info).to.have.property('quantity').to.equal(1);
            expect(res.body.free_stock_info).to.have.property('filled_price');
            expect(getUser(id)).to.have.property('free_share_status').to.equal('claimed');
            expect(getAccountOrders(id).length).to.equal(3);
            expect(getAccountPositions(id)).to.have.property(res.body.free_stock_info.ticker_symbol);
            done();
            });
    });

    it('should handle market not being open', (done) => {
        process.env.MARKET_STATE = 'closed';
        const id = 2;
        setUser(id, {free_share_status: 'eligible'});
        chai.request(app)
            .post('/claim-free-share')
            .send({ id })
            .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('success').to.equal(false);
            expect(res.body).to.have.property('messages').to.include('The market is currently closed. The next opening time is ' + process.env.NEXTOPENINGTIME + ' and the next closing time is ' + process.env.NEXTCLOSINGTIME + '. Please try again in between these times.');
            done();
            });
    });
  });
});
