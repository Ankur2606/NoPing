/**
 * Sample Emails for Voice Briefing Testing
 * 
 * This file contains sample email data matching the project schema
 * with critical, action, and info priorities
 */

const sampleEmails = [{
        type: 'email',
        content: 'We need to urgently fix the payment processing system. Multiple customers are reporting failures when trying to complete transactions. This is impacting our revenue significantly. Please address this as soon as possible.',
        timestamp: new Date('2025-05-24T09:15:00'),
        priority: 'critical',
        read: false,
        sourceId: 'email-10001',
        from: {
            name: 'Sarah Chen',
            email: 'sarah.chen@example.com'
        },
        to: ['dev-team@company.com'],
        subject: 'URGENT: Payment System Down',
        attachments: [{
            filename: 'error_logs.txt',
            mimeType: 'text/plain',
            size: 25600
        }]
    },
    {
        type: 'email',
        content: 'The client meeting for the new project has been moved to tomorrow at 2 PM. Please make sure you\'ve reviewed the proposal documents I sent earlier this week. The client is particularly interested in our implementation timeline.',
        timestamp: new Date('2025-05-24T11:30:00'),
        priority: 'action',
        read: false,
        sourceId: 'email-10002',
        from: {
            name: 'Michael Rodriguez',
            email: 'michael.r@example.com'
        },
        to: ['you@company.com'],
        subject: 'Client Meeting Rescheduled - Action Required',
        attachments: []
    },
    {
        type: 'email',
        content: 'Security audit deadline has been moved up. We need all teams to complete their security reviews by end of week instead of next month. Please prioritize this task as we need to submit compliance documentation to regulators.',
        timestamp: new Date('2025-05-24T14:45:00'),
        priority: 'critical',
        read: false,
        sourceId: 'email-10003',
        from: {
            name: 'Alex Wong',
            email: 'security@example.com'
        },
        to: ['all-staff@company.com'],
        subject: 'URGENT: Security Audit Timeline Change',
        attachments: [{
            filename: 'security_checklist.pdf',
            mimeType: 'application/pdf',
            size: 1048576
        }]
    },
    {
        type: 'email',
        content: 'Just a reminder that the company picnic is scheduled for next Saturday at Riverside Park. Please let HR know if you\'re planning to attend and how many guests you\'ll bring. Looking forward to seeing everyone!',
        timestamp: new Date('2025-05-23T10:00:00'),
        priority: 'info',
        read: false,
        sourceId: 'email-10004',
        from: {
            name: 'HR Department',
            email: 'hr@example.com'
        },
        to: ['all-employees@company.com'],
        subject: 'Company Picnic Reminder',
        attachments: [{
            filename: 'picnic_details.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 512000
        }]
    },
    {
        type: 'email',
        content: 'We need to prepare the quarterly financial report by Friday. Please send me your department\'s expenditure data by Wednesday EOD. This is particularly important as we have the board meeting next week.',
        timestamp: new Date('2025-05-24T08:30:00'),
        priority: 'action',
        read: false,
        sourceId: 'email-10005',
        from: {
            name: 'Finance Director',
            email: 'finance@example.com'
        },
        to: ['department-heads@company.com'],
        subject: 'Quarterly Financial Report Due',
        attachments: [{
            filename: 'financial_template.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 768000
        }]
    },
    {
        type: 'email',
        content: 'The new product launch has been approved. Please schedule a team meeting to review the marketing strategy and release timeline. We need to move quickly to beat competitors to market.',
        timestamp: new Date('2025-05-23T16:20:00'),
        priority: 'action',
        read: false,
        sourceId: 'email-10006',
        from: {
            name: 'Product Manager',
            email: 'product@example.com'
        },
        to: ['marketing@company.com', 'development@company.com'],
        subject: 'Product Launch Approval',
        attachments: []
    },
    {
        type: 'email',
        content: 'Server downtime alert: Our main production server has been experiencing intermittent outages in the past hour. The DevOps team is currently investigating. Please pause any deployments until further notice.',
        timestamp: new Date('2025-05-24T15:10:00'),
        priority: 'critical',
        read: false,
        sourceId: 'email-10007',
        from: {
            name: 'System Alert',
            email: 'alerts@example.com'
        },
        to: ['it-staff@company.com', 'management@company.com'],
        subject: 'CRITICAL: Production Server Issues',
        attachments: []
    },
    {
        type: 'email',
        content: 'The monthly newsletter is now available. Check out updates on company events, employee spotlights, and upcoming training opportunities.',
        timestamp: new Date('2025-05-22T09:00:00'),
        priority: 'info',
        read: false,
        sourceId: 'email-10008',
        from: {
            name: 'Internal Communications',
            email: 'communications@example.com'
        },
        to: ['all-staff@company.com'],
        subject: 'Monthly Newsletter - May 2025',
        attachments: [{
            filename: 'newsletter_may.pdf',
            mimeType: 'application/pdf',
            size: 2097152
        }]
    },
    {
        type: 'email',
        content: 'Your project proposal has been approved by the steering committee. Please work with finance to secure the required budget and begin resource allocation planning.',
        timestamp: new Date('2025-05-23T14:30:00'),
        priority: 'action',
        read: false,
        sourceId: 'email-10009',
        from: {
            name: 'Project Office',
            email: 'projects@example.com'
        },
        to: ['you@company.com'],
        subject: 'Project Approval - Next Steps',
        attachments: [{
            filename: 'approval_document.pdf',
            mimeType: 'application/pdf',
            size: 1572864
        }]
    },
    {
        type: 'email',
        content: 'A critical security vulnerability has been identified in our authentication system. We need to implement the patch immediately. Please coordinate with the security team for deployment details.',
        timestamp: new Date('2025-05-24T12:45:00'),
        priority: 'critical',
        read: false,
        sourceId: 'email-10010',
        from: {
            name: 'Security Officer',
            email: 'security-alerts@example.com'
        },
        to: ['development@company.com', 'ops@company.com'],
        subject: 'CRITICAL: Security Vulnerability - Immediate Action Required',
        attachments: [{
            filename: 'patch_details.txt',
            mimeType: 'text/plain',
            size: 15360
        }]
    }
];

module.exports = { sampleEmails };