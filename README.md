# jquery.address-integration

## Overview
This plugin allows user to search the best match of given piece of address (especially zip code) using google maps API and fill the form fields with found geographical data. For example if user typed "12345" (which is postal code) in specify input, plugin can populate country, state, city and street in specify fields (given in options).

## Usage
First, you have to include the [jQuery](http://jquery.com/) and [jQuery throttle / debounce](http://benalman.com/projects/jquery-throttle-debounce-plugin/).

```html
<script src="jquery.js" type="text/javascript"></script>
<script src="jquery.ba-throttle-debounce.js" type="text/javascript"></script>
```

### Simple init

Next you can initialize the plugin:

```js
$('#address').addressIntegration();
```

### Advanced init

You can also initialize the plugin with specify options:

```js
$('#address').addressIntegration({
  zipcodeMode:                                false, // if set to true plugin accept only zip code typed in specify input (given during initialization)
  regionInfluence:                            false, // region code, specified as a ccTLD ("top-level domain") two-character value, this parameter will only influence, not fully restrict, results from the geocoder, can be set to false
  regionRestriction:                          false, // region code, specified as a ccTLD ("top-level domain") two-character value, this parameter will fully restrict results to a specific country, can be set to false
  events:                                     'propertychange change click keyup input paste', //events binded to element (on which you called this plugin) for populate data to specify fields given in options
  debounceEventsTime:                         250, //debounce time for events fired
  retryTime:                                  3000, // time for query retry if too many queries
  customErrorMessage:                         'No results for given data, the given place propably does not exist.',
  countrySelector:                            '#country', // can be set to false
  countryShortSelector:                       '#country-short', // can be set to false
  citySelector:                               '#city', // can be set to false
  stateSelector:                              '#state', // can be set to false
  stateShortSelector:                         '#state-short', // can be set to false
  postalCodeSelector:                         '#postal-code', // can be set to false
  routeSelector:                              '#route', // can be set to false
  streetNumberSelector:                       '#street-number', // can be set to false
  loaderSelector:                             '#address-integration-loader', //selector for loader image
  messageSelector:                            '#address-integration-messages', //selector for plugins messages container
  callbackEventFired:                         function() {  }, //callback fired when events are fired
  callbackInProgress:                         function() {  }, //callback fired when request for google maps api is in progress
  callbackSuccess:                            function(results) {  }, //callback fired when request is done with status success
  callbackError:                              function(errorMessage) {  } //callback fired when request is done with status error or no results
});
```

And now when you type something in '#address' input, fields, which selectors you have entered in options, will be populate with found data.

### Public methods

You can also use one of these methods:

```js
checkAddress()
```
this method is checking immediately given piece od address, without any delay.
```js
checkAddressCustom(callbackSuccess, callbackError, callbackInProgress)
```
same as below but you can set callbacks for each state of request.
```js
destroy()
```
this method destroy current instance of plugin

#### Example

You can call the method in the way shown below. First parameter is always name of the method you want to call, other parameters are optional, dependent on specify method you called.

```js
$('#address').addressIntegration('checkAddressCustom', function(){
  console.log("Success");
}, function(){
  console.log("Fail");
}, function(){
  console.log("Request in progress");
});
```
