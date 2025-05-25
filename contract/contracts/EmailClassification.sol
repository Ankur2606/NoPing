// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmailClassification {
    struct Classification {
        string emailId;
        string label;
        string reasoning;
    }

    struct UserClassifications {
        string userId;
        Classification[] classifications;
    }

    mapping(address => UserClassifications) private addressToData;
    mapping(string => address) private userIdToAddress;

    event ClassificationSaved(
        address indexed user,
        string userId,
        string emailId,
        string label,
        string reasoning
    );

    // Struct input for bulk classification
    struct ClassificationInput {
        string emailId;
        string label;
        string reasoning;
    }

    // Bulk save function using userId and list of ClassificationInput objects
    function bulkSaveClassifications(
        string memory _userId,
        ClassificationInput[] memory _entries
    ) public {
        if (bytes(addressToData[msg.sender].userId).length == 0) {
            addressToData[msg.sender].userId = _userId;
            userIdToAddress[_userId] = msg.sender;
        }

        for (uint i = 0; i < _entries.length; i++) {
            Classification memory c = Classification({
                emailId: _entries[i].emailId,
                label: _entries[i].label,
                reasoning: _entries[i].reasoning
            });

            addressToData[msg.sender].classifications.push(c);

            emit ClassificationSaved(msg.sender, _userId, c.emailId, c.label, c.reasoning);
        }
    }

    // Fetch classifications using userId
    function getClassificationsByUserId(string memory _userId) public view returns (
        string memory userId,
        Classification[] memory classifications
    ) {
        address userAddr = userIdToAddress[_userId];
        require(userAddr != address(0), "User ID not found");

        return (
            addressToData[userAddr].userId,
            addressToData[userAddr].classifications
        );
    }
}
