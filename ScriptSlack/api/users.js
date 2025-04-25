module.exports = (client) => ({
  getUserInfo: async (userId) => {
    try {
      return await client.users.info({ user: userId });
    } catch (error) {
      console.error("User Error:", error);
      throw new Error("Failed to fetch user information");
    }
  },

  listUsers: async () => {
    try {
      return await client.users.list();
    } catch (error) {
      console.error("User List Error:", error);
      throw new Error("Failed to fetch users list");
    }
  },
});
