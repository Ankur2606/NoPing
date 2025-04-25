module.exports = (client) => ({
  listFiles: async (options = {}) => {
    try {
      return await client.files.list(options);
    } catch (error) {
      console.error("Files Error:", error);
      throw new Error("Failed to fetch files list");
    }
  },

  getFileInfo: async (fileId) => {
    try {
      return await client.files.info({ file: fileId });
    } catch (error) {
      console.error("File Info Error:", error);
      throw new Error("Failed to fetch file information");
    }
  },
});
