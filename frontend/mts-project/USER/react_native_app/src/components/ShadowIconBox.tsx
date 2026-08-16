import React from 'react';
import { Image, View } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const ShadowIconBox = ({
  icon,
  color,
  size = 62,
  iconSize = 28,
  radius = 18,
  iconFamily = 'MaterialIcons',
  imageUri = undefined,
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: color,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.95,
        shadowRadius: 32,
        elevation: 24,
      }}
    >
      {imageUri && !imageFailed ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="cover"
          style={{ width: '100%', height: '100%', borderRadius: radius }}
          onError={() => setImageFailed(true)}
        />
      ) : iconFamily === 'Ionicons' ? (
        <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
      ) : (
        <MaterialIcons name={icon} size={iconSize} color="#FFFFFF" />
      )}
    </View>
  );
};

export default ShadowIconBox;
