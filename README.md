# bms-clientsdk-javascript-push

Enable Chrome & Firefox web browser applications to receive Bluemix Push notifications and, send Bluemix Push
notifications to these Chrome & Firefox web browser applications. This section describes how to install and use the client
JavaScript Push SDK to further develop your Web applications.

### Initialize in Chrome & Firefox

For installing the Javascript SDK in Chrome Web application follow the steps.

Download the `BMSPushSDK.js`,`BMSPushServiceWorker.js` and `manifest.json` from the [Bluemix Web push SDK](https://codeload.github.com/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush/zip/development)

1. Edit the `manifest.json` file

	For Chrome browser do the following,

	* Change `name` to your Website's name
	* Change `gcm_sender_id` to your Google Cloud Messaging (GCM) sender_ID ([How to get it ? Click here](t_push_provider_android.html)). The gcm_sender_id value contains only numbers.

		```
		{
			"name": "YOUR_WEBSITE_NAME",
			"gcm_sender_id": "GCM_Sender_Id"
		}
		```

	For Firefox browser add the following values in `manifest.json` file.

	* Change `name` to your Website's name

	```
	{
		"name": "YOUR_WEBSITE_NAME"
	}
	```

2. Add the `BMSPushSDK.js`,`BMSPushServiceWorker.js``manifest.json` to your root directory.

3. Include the `manifest.json` in `<head>` tag of your html file .

	```
	<link rel="manifest" href="manifest.json">
	```
4. Include Bluemix Web push SDK to the web application from github.

	```
  <script src="BMSPushSDK.js" async></script>

	```


## Initializing the Web Push SDK (Chrome & FireFox)

Initialse the push SDK with Bluemix push notifications service `app GUID` and `app Region`.  

To get your app GUID, select the Configuration option in the navigation pane for your initialized push services and click **Mobile Options**.Modify the code snippet to use your Bluemix push notifications service appGUID parameter.

The `App Region` specifies the location where the Push service is hosted. You can use one of the three values:

- For US Dallas - `.ng.bluemix.net`
- For UK - `.eu-gb.bluemix.net`
- For Sydney - `.au-syd.bluemix.net`

```
    var bmsPush = new BMSPush();
    function callback(response) {
        alert(response.response)
    }
    var initParams = {
        "appGUID":"push app GUID",
        "appRegion":"Region where service hosted"
    }
    bmsPush.initialize(params, callback)
```

## Registering Web application.

Use the `register()` API to register the device with {{site.data.keyword.mobilepushshort}} service. For registering from Chrome , add the Google Cloud Messaging (GCM) API Key and Web Site URL  in the Bluemix {{site.data.keyword.mobilepushshort}} service web configuration dashboard. For more information, see [Configuring credentials for Google Cloud Messaging](t_push_provider_android.html) under Chrome setup.

For registering from Firefox , add Web Site URL in the Bluemix {{site.data.keyword.mobilepushshort}} service web configuration dashboard under Firefox setup.

Use the following code snippet to register in Bluemix push notifications service.

```
	var bmsPush = new BMSPush();
	function callback(response) {
		alert(response.response)
	}
	var initParams = {
		"appGUID":"push app GUID",
		"appRegion":"Region where service hosted"
	}
	bmsPush.initialize(params, callback)
	bmsPush.register(function(response) {
		alert(response.response)
	})

```

>Note : For Debugging use `bmsPush.isDebugEnable(true)`.
