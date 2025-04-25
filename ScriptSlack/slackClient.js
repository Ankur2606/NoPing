require('dotenv').config();
const { WebClient } = require('@slack/web-api');

class SlackClient {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.initializeServices();
  }

  initializeServices() {
    this.channels = require('./api/channels')(this.client);
    this.users = require('./api/users')(this.client);
    this.files = require('./api/files')(this.client);
  }
}

module.exports = new SlackClient();
