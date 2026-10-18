// Windows sandbox compatibility: async realpath may return EPERM even when
// the same path is readable and resolves through the permitted synchronous API.
const fs = require('node:fs');
if (process.platform === 'win32') {
  const original = fs.promises.realpath.bind(fs.promises);
  fs.promises.realpath = async function (path, options) {
    try { return await original(path, options); }
    catch (error) {
      if (error.code !== 'EPERM') throw error;
      return fs.realpathSync(path, options);
    }
  };
}
