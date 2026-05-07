const upstreamTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = ({ src, filename, options }) => {
  let patched = src;
  if (filename.includes('node_modules')) {
    patched = patched.replace(/import\.meta\.env\b/g, '({})');
    patched = patched.replace(/import\.meta(?!\.env)/g, '{url:"http://localhost"}');
  }
  return upstreamTransformer.transform({ src: patched, filename, options });
};
