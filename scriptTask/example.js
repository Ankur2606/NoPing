/**
 * Example usage of the Task Generator
 * 
 * This file demonstrates how to use the task generator
 * to convert messages from different sources into tasks.
 */

const { generateTaskFromMessage } = require('./taskGenerator');

// Example message objects (email, slack, teams)
const exampleEmailMessage = {
    type: "email",
    content: "Hi Team, Please review the attached project proposal and send feedback by Friday. We need to finalize this by the end of the week. Thanks, John",
    timestamp: new Date(),
    priority: "action",
    read: false,
    sourceId: "email123",
    from: {
        name: "John Smith",
        email: "john@example.com"
    },
    to: ["team@company.com"],
    subject: "Project Proposal Review - Due Friday",
    attachments: [{
        filename: "project_proposal.pdf",
        mimeType: "application/pdf",
        size: 2500000
    }]
};

const exampleSlackMessage = {
    type: "slack",
    content: "@alex Can you update the dashboard with the latest numbers? The client meeting is tomorrow morning.",
    timestamp: new Date(),
    priority: "critical",
    read: false,
    sourceId: "slack456",
    channel: "client-projects",
    sender: {
        name: "Sarah Johnson",
        avatar: "https://example.com/avatar.jpg"
    },
    mentions: true,
    reactions: [
        { emoji: "👍", count: 3 }
    ]
};

const exampleTeamsMessage = {
    type: "teams",
    content: "The deployment scheduled for tonight has been postponed to next Tuesday. Please update your calendars.",
    timestamp: new Date(),
    priority: "info",
    read: false,
    sourceId: "teams789",
    channel: "Development Team",
    sender: {
        name: "Mike Wilson",
        email: "mike@company.com"
    },
    mentions: false
};

// Async function to run the examples
async function runExamples() {
    try {
        console.log("Converting email message to task...");
        const emailTask = await generateTaskFromMessage(exampleEmailMessage);
        console.log("Email task:", JSON.stringify(emailTask, null, 2));

        console.log("\nConverting Slack message to task...");
        const slackTask = await generateTaskFromMessage(exampleSlackMessage);
        console.log("Slack task:", JSON.stringify(slackTask, null, 2));

        console.log("\nConverting Teams message to task...");
        const teamsTask = await generateTaskFromMessage(exampleTeamsMessage);
        console.log("Teams task:", JSON.stringify(teamsTask, null, 2));
    } catch (error) {
        console.error("Error running examples:", error);
    }
}

// Only run if called directly
if (require.main === module) {
    runExamples();
}

module.exports = { runExamples };