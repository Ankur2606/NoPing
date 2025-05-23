// index.js  
require('dotenv').config();  
const { Client } = require('@notionhq/client');  

// Initialize Notion client  
const notion = new Client({ auth: process.env.NOTION_TOKEN });  

const STATUS_MAP = {
  0: 'Not started', // Default
  1: 'In progress',
  2: 'Done'
};


async function pushMessage(message, status = 0) {
  // Check if required parameters are provided  
  try {  
    const statusName = STATUS_MAP[status] || STATUS_MAP[0];
    const response = await notion.pages.create({  
      parent: {  
        database_id: process.env.DATABASE_ID,  
      },  
      properties: {  
        Name: {  
          title: [  
            {  
              text: {  
                content: message,  
              },  
            },  
          ],  
        },  
        Status: {  
          status: {  
            name: statusName,  
          },  
        },  
        Date: {  
          date: {  
            start: new Date().toISOString(),  
          },  
        },  
      },  
    });  
    console.log('Message pushed:', response.id);  
  } catch (error) {  
    console.error('Error:', error.message);  
  }  
}  


// Example usage  
pushMessage('Buy groceries');

// Add task with status 1 (In progress)
pushMessage('Clean the house', 1);

// Add task with status 2 (Done)
pushMessage('Pay bills', 2);
