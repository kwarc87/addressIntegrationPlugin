/*!
 * jQuery Address Integration Plugin 1.2
 * https://github.com/kwarc87/addressIntegrationPlugin/tree/master
 *
 * Copyright (c) 2016 Jakub Kwarciński
 * Released under the GPL license
 * http://portfolio-kwarc.pl/
 */

(function() {

    var guid = 0;
    var geocoder;

    //constructor
    var addressIntegrationObj = function (element, options) {
        var plugin = this;
        plugin.guid = guid;
        plugin.settings = $.extend({}, addressIntegrationInterface.defaults, options);
        plugin.$element = $(element);
        plugin.eventPrefix = '.addressIntegration'+plugin.guid;
        plugin.events = addPrefixesToEvents(plugin.settings.events, plugin.eventPrefix);
        plugin.errors = null;
        plugin.lastValue = "";
        plugin.querries = 0;
        plugin.querriesTmp = 0;
        plugin.timerQueryRetry = null;
        if(!geocoder) {
            geocoder = new google.maps.Geocoder();
        }
        plugin.geocoder = geocoder;
        plugin.debounce = $.debounce( plugin.settings.debounceEventsTime, function() {
            if(plugin.querriesTmp !== 0) {
                plugin.checkAddress();
            }
        });
    }

    //helper functions
    var addPrefixesToEvents =  function (events, prefix) {
        var eventsArray = new Array();
        eventsArray = events.split(" ");
        var tmp = "";
        for (var i = 0; i < eventsArray.length; i++) {
            tmp += eventsArray[i] + prefix + " ";
        }
        return tmp;
    }

    var getDataFromGeocodingResponse = function (results, addressComponent, longOrShortName) {
        var a = results[0].address_components;
        var data;
        for(var i = 0; i < a.length; ++i) {
            var t = a[i].types;
            if(compIsType(t, addressComponent)) {
                data = a[i][longOrShortName];
            }
        }
        return data;
    }

    var compIsType = function (t, s) {
       for(var z = 0; z < t.length; ++z)
          if(t[z] == s)
             return true;
       return false;
    }

    //google maps api errors
    var errorsMessages = {
        'GOOGLE_MAPS_ERROR': 'Google maps error.',
        'OVER_QUERY_LIMIT':  'Too many queries! Please wait a moment and try again.',
        'REQUEST_DENIED':    'Your request was denied',
        'INVALID_REQUEST':   'Your query is missing',
        'UNKNOWN_ERROR':     'Propably server error, please try again.',
        'UNKNOWN_ERROR_2':   'Unknown error.',
        'ERROR':             'Google maps unknown error.'
    }

    //public methods
    addressIntegrationObj.prototype = {
        init: function() {
            var plugin = this;
            var $element = this.$element;
            if($element.val()) {
                plugin.checkAddress();
            }
            $element.on( plugin.events, function() {
                if( ($element.val() !== plugin.lastValue) || (plugin.errors in errorsMessages) ) {
                    plugin.querries++;
                    plugin.querriesTmp++;
                    plugin.settings.callbackEventFired.apply(plugin);
                    plugin.debounce();
                }
            });
        },
        // this function check address and execute calbacks from settings
        checkAddress: function() {
            var plugin = this;
            var $element = this.$element;
            plugin.checkAddressCustom(plugin.settings.callbackSuccess, plugin.settings.callbackError, plugin.settings.callbackInProgress);
        },
        // this function check address and execute calbacks from parameters
        checkAddressCustom: function(callbackSuccess, callbackError, callbackInProgress) {
            var plugin = this;
            var $element = this.$element;
            plugin.querries = plugin.querries - plugin.querriesTmp + 1;
            plugin.querriesTmp = 0;
            var callbackNumber = plugin.querries;
            plugin.lastValue = $element.val();
            var address = $element.val();
            var query = { 'address': address };
            query['componentRestrictions'] = {};
            if(plugin.settings.zipcodeMode) {
                query['componentRestrictions']['postalCode'] = address;
            }
            if(plugin.settings.regionInfluence) {
                query['region'] = plugin.settings.regionInfluence;
            }
            if(plugin.settings.regionRestriction) {
                query['componentRestrictions']['country'] = plugin.settings.regionRestriction;
            }
            plugin.showLoader();
            if (callbackInProgress) { callbackInProgress.apply(plugin); }
            plugin.geocoder.geocode(query, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    plugin.geocoder.geocode({'latLng': results[0].geometry.location }, function(results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {
                            if (results[1]) {
                                //success
                                plugin.queue(callbackNumber, function() {
                                    plugin.checkAddressSuccess(results, callbackSuccess);
                                });
                            } else {
                                //fail
                                plugin.queue(callbackNumber, function() {
                                    plugin.checkAddressFail('NO_RESULTS', callbackError);
                                });
                            }
                        } else {
                            //fail
                            plugin.queue(callbackNumber, function() {
                                plugin.checkAddressFail(status, callbackError);
                            });
                        }
                    });
                } else {
                    //fail
                    plugin.queue(callbackNumber, function() {
                        plugin.checkAddressFail(status, callbackError);
                    });
                }
            });
        },
        //execute callback only for last request
        queue: function(callbackNumber, callback) {
            var plugin = this;
            if(callbackNumber === plugin.querries) {
                callback();
            }
        },
        //success callback for function checkAddressCustom
        checkAddressSuccess: function(results, callbackSuccess) {
            var plugin = this;
            var $element = this.$element;
            clearTimeout(plugin.timerQueryRetry);
            if(plugin.errors !== null) {
                plugin.errors = null;
                plugin.hideErrors();
            }
            plugin.hideLoader();
            plugin.setFields(results);
            if (callbackSuccess) { callbackSuccess.call(plugin, results); }
        },
        //fail callback for function checkAddressCustom
        checkAddressFail: function(errorMessage, callbackError) {
            var plugin = this;
            var $element = this.$element;
            clearTimeout(plugin.timerQueryRetry);
            if(errorMessage === 'OVER_QUERY_LIMIT') {
                //retry query if too many queries after retryTime
                plugin.timerQueryRetry = setTimeout(function() {
                    plugin.checkAddress();
                }, plugin.settings.retryTime)
            } else {
                plugin.errors = errorMessage;
                plugin.hideLoader();
                plugin.showErrors();
                if (callbackError) { callbackError.call(plugin, errorMessage); }
            }
        },
        //set values for inputs from settings
        setFields: function(results) {
            var plugin = this;
            if (plugin.settings.countrySelector) { $(plugin.settings.countrySelector).val(getDataFromGeocodingResponse(results, 'country', 'long_name')); }
            if (plugin.settings.countryShortSelector) { $(plugin.settings.countryShortSelector).val(getDataFromGeocodingResponse(results, 'country', 'short_name')); }
            if (plugin.settings.citySelector) { $(plugin.settings.citySelector).val(getDataFromGeocodingResponse(results, 'locality', 'long_name')); }
            if (plugin.settings.stateSelector) { $(plugin.settings.stateSelector).val(getDataFromGeocodingResponse(results, 'administrative_area_level_1', 'long_name')); }
            if (plugin.settings.stateShortSelector) { $(plugin.settings.stateShortSelector).val(getDataFromGeocodingResponse(results, 'administrative_area_level_1', 'short_name')); }
            if (plugin.settings.postalCodeSelector) { $(plugin.settings.postalCodeSelector).val(getDataFromGeocodingResponse(results, 'postal_code', 'long_name')); }
            if (plugin.settings.routeSelector) { $(plugin.settings.routeSelector).val(getDataFromGeocodingResponse(results, 'route', 'long_name')); }
            if (plugin.settings.streetNumberSelector) { $(plugin.settings.streetNumberSelector).val(getDataFromGeocodingResponse(results, 'street_number', 'long_name')); }
        },
        //show errors
        showErrors: function() {
            var plugin = this;
            if(plugin.errors === 'ZERO_RESULTS' || plugin.errors === 'NO_RESULTS') {
                $(plugin.settings.messageSelector).text(plugin.settings.customErrorMessage).show();
            } else {
                if(plugin.errors in errorsMessages) {
                    $(plugin.settings.messageSelector).text(errorsMessages[plugin.errors]).show();
                } else {
                    $(plugin.settings.messageSelector).text(plugin.errors).show();
                }
            }
        },
        //hide errors
        hideErrors: function() {
            var plugin = this;
            $(plugin.settings.messageSelector).hide().empty();
        },
        //show loader
        showLoader: function() {
            var plugin = this;
            $(plugin.settings.loaderSelector).show();
        },
        //hide loader
        hideLoader: function() {
            var plugin = this;
            $(plugin.settings.loaderSelector).hide();
        },
        //unbind events
        unbindEvents: function() {
            var plugin = this;
            plugin.$element.off(plugin.eventPrefix);
        },
        //destroy plugin instance
        destroy: function() {
            var plugin = this;
            plugin.unbindEvents();
            plugin.$element.data('addressIntegration', null);
        }
    }

    //plugin
    function addressIntegrationInterface(methodOrOptions) {
        var methodsParameters = Array.prototype.slice.call( arguments, 1 );
        return this.each(function () {
            if (!$(this).data('addressIntegration')) {
                var plugin = new addressIntegrationObj(this, methodOrOptions);
                $(this).data('addressIntegration', plugin);
                plugin.init();
            } else if (typeof methodOrOptions === 'object') {
                $.error( 'jQuery.addressIntegration already initialized' );
            } else {
                var plugin = $(this).data('addressIntegration');
                if ( plugin[methodOrOptions] ) {
                    plugin[methodOrOptions].apply(plugin, methodsParameters);
                } else {
                    $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.addressIntegration' );
                }
            }
        })
    }

    //defaults options
    addressIntegrationInterface.defaults = {
        zipcodeMode:                                false, // if set to true plugin accept only zip code typed in specify input (given during initialization)
        regionInfluence:                            false, // region code, specified as a ccTLD ("top-level domain") two-character value, this parameter will only influence, not fully restrict, results from the geocoder, can be set to false
        regionRestriction:                          false, // region code, specified as a ccTLD ("top-level domain") two-character value, this parameter will fully restrict results to a specific country, can be set to false
        events:                                     'propertychange change click keyup input paste', //events binded to element (on which you called this plugin) for populate data to specify fields given in options
        debounceEventsTime:                         250, // debounce time for events fired
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
        loaderSelector:                             '#address-integration-loader', // selector for loader image
        messageSelector:                            '#address-integration-messages', // selector for plugins messages container
        callbackEventFired:                         function() {  }, // callback fired when events are fired
        callbackInProgress:                         function() {  }, // callback fired when request for google maps api is in progress
        callbackSuccess:                            function(results) {  }, // callback fired when request is done with status success
        callbackError:                              function(errorMessage) {  } // callback fired when request is done with status error or no results
    };

    $.fn.addressIntegration = addressIntegrationInterface;

})();