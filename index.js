
const http = require('http')
const https = require('https');
var CronJob = require('cron').CronJob;
const domains = require('./domains.json');
const fs = require('fs');
require('dotenv').config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);


// Send a text message using Twilio
const sendMessage = (domain) => {
	console.debug("sendMessage", domain);
	// get full logs until now
	const logs = require('./logs.json');
	// check if domain is already in logs
	if (logs.findIndex(log => new Date(log.date).getDate() === new Date().getDate() && log.domain === domain.name) === -1) {
		console.debug("sendMessage has not been sent today for this domain", domain.name);
		// send message to phone number specified in .env file (TWILIO_PHONE_NUMBER) 
		client.messages
			.create({
				body: 'Seite offline ' + domain.name,
				from: process.env.TWILIO_ACCOUNT_NUMBER,
				to: process.env.TELEPHONE_NUMBER
			})
			.then(message => {
				// add log to logs.json
				console.debug("sendMessage sent");
				logs.push({
					domain: domain.name,
					date: new Date(),
					message: message.body
				});
				require('fs').writeFile('./logs.json', JSON.stringify(logs), (err) => {
					if (err) throw err;
					console.debug('The file has been saved!');
				});
			});
	} else {
		console.debug("sendMessage has been sent today for ", domain.name);
	}
}

// function to check if domains are online
const checkDomains = () => {
	domains.forEach(domain => {
		https.get(domain.val, (res) => {
			if (res.statusCode.toString().charAt(0) == "4" && res.statusCode.toString().charAt(0) == "5") {
				console.debug(`${domain.name} is down!`);
				sendMessage(domain);
			} else
				console.debug(`${domain.name} is up!`);
		}).on('error', (e) => {
			console.debug(`${domain.name} is down!`);
			sendMessage(domain);
		});
	});
}

// check domains every 5 minutes
const startCron = (domains = undefined) => {
	if (domains) {
		fs.writeFile('./domains.json', JSON.stringify(domains), (err) => {
			if (err) throw err;
			console.debug('The file has been saved!');
		})
	}
	if (!fs.existsSync('./domains.json')) return console.log('domains.json not found, please create it first');
	if (!fs.existsSync('./logs.json')) fs.writeFileSync('./logs.json', '[]');

	new CronJob('0 */1 * * * *', checkDomains).start();
}

module.exports = startCron;

startCron();