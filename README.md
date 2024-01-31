# Emma Challenge

This is a simple stock trading endpoint developed using Node.js and Express.js. The purpose of the application is to reward new customers with a free share when they first sign up to use the trading service.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine
- [npm](https://www.npmjs.com/) package manager (comes with Node.js)

### Installing

1. Clone the repository to your local machine:

   git clone https://github.com/paddymitch/emma-challenge.git

2. Navigate to the project directory:

   cd emma-challenge

3. Install dependencies:

   npm install
  
### Running the Application
Start the server: npm start

The server will be running at http://localhost:3000.

### Running Tests
To run tests, execute: npm test

This will execute Mocha and run the tests defined in the test.js file.

### Usage
The primary endpoint for claiming a free share is /claim-free-share. You can make a POST request to this endpoint with a valid user ID to simulate the claiming of a free share.

curl -X POST -H "Content-Type: application/json" -d '{"id": <valid_user_id>}' http://localhost:3000/claim-free-share

