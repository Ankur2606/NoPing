# Email Classification Smart Contracts for opBNB

This directory contains Solidity smart contracts designed to securely store email classification data on the opBNB blockchain. These contracts enable a trusted backend to store email classification data while ensuring that only the intended users can access their own data.

## Contracts

### 1. EmailClassificationStorage.sol

A simple contract for storing individual email classifications:

- **Features**:
  - Store email classifications with labels (FLOW_CRITICAL, FLOW_ACTION, FLOW_INFO)
  - Store reasoning text for each classification
  - Each classification is tied to a specific user
  - Only the backend can write classifications
  - Users can only read their own classifications
  - Classifications can be updated or soft-deleted

### 2. EmailBatchStorage.sol

An optimized contract for storing email classifications in batches:

- **Features**:
  - Store multiple email classifications in a single transaction (gas-efficient)
  - Batch operations for improved throughput
  - Efficient lookups for specific email classifications
  - Pagination and retrieval of recent classifications
  - Only the backend can write batches
  - Users can only read their own batches and classifications

### 3. AccessControl.sol

A contract for managing role-based access control:

- **Features**:
  - Role-based permissions (ADMIN_ROLE, BACKEND_ROLE, etc.)
  - Only owner can grant/revoke roles
  - Guards sensitive operations in other contracts

## Data Structure

Each email classification entry includes:
- `emailId`: Unique identifier for the email (matching the backend's database)
- `label`: Classification (FLOW_CRITICAL, FLOW_ACTION, or FLOW_INFO)
- `reasoning`: Text explaining why this classification was chosen
- `timestamp`: When the classification was created

## Deployment

Deploy the contracts using:

```bash
npx hardhat run scripts/deploy-email-contracts.js --network opbnb
```

## Testing

Run the test suite:

```bash
npx hardhat test test/email-classification-test.js
```

## Security Considerations

1. **Privacy**: All data is private - users can only access their own classifications
2. **Authorization**: Only the backend with proper role can write data
3. **Efficiency**: Batch operations reduce gas costs
4. **Ownership**: Clear ownership model prevents unauthorized access

## Integration

1. Deploy the contracts to opBNB
2. Grant BACKEND_ROLE to your server's wallet address
3. Integrate with your backend to write classifications
4. Update frontend to query classifications directly from the blockchain

## License

MIT
