import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  View,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  BackHandler,
} from "react-native";
import { WebView } from "react-native-webview";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";

const { height: screenHeight } = Dimensions.get("window");

const HomeScreen = () => {
  const webViewRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Request notification permissions and get token
  const registerForPushNotificationsAsync = async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Enable notifications in settings to receive updates."
      );
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Push token:", token);

    return token;
  };

   // Handle the hardware back button
   useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, []);

  // Handle incoming foreground notifications
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);

        // Forward the notification data to the WebView
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "pushNotification",
            payload: notification.request.content.data,
          })
        );
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification interacted with:", response);
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Monitor network connection
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Refresh WebView
  const onRefresh = async () => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setRefreshing(false);
  };

  // Handle image upload
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "We need access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;

      // Send the selected image URI to the WebView
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "imageUpload",
          payload: { uri: imageUri },
        })
      );
    }
  };

  // Listen for messages from WebView
  const onMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);

    if (data.type === "requestImageUpload") {
      handlePickImage(); // Trigger image upload
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {!isConnected ? (
        <View style={styles.noConnectionContainer}>
          <Image
            source={require("../../assets/images/internet.png")}
            style={styles.image}
          />
          <Text style={styles.noConnectionText}>No Internet Connection</Text>
          <Text style={styles.subText}>
            Please check your connection and try again.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <WebView
            ref={webViewRef}
            source={{ uri: "https://eximbd.com.my/" }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            allowsFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            onMessage={onMessage}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  noConnectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  noConnectionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ff4d4f",
  },
  image: {
    height: 200,
    width: 200,
    resizeMode: "contain",
    marginBottom: 20,
  },
  subText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default HomeScreen;
