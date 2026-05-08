module.exports = {
  dependencies: {
    'react-native-tcp-socket': {
      root: __dirname,
      platforms: {
        android: {
          sourceDir: './node_modules/react-native-tcp-socket/android',
          packageImportPath: 'import com.asterinet.react.tcpsocket.TcpSocketPackage;',
          packageInstance: 'new TcpSocketPackage()',
        },
        ios: {
          podspecPath: './node_modules/react-native-tcp-socket/react-native-tcp-socket.podspec',
        },
      },
    },
  },
};
