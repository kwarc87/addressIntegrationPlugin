(function() {

    var guid = 0;
    var geocoder;

    //constructor
    var addressIntegrationObj = function (element, options) {
        this.settings = $.extend({}, addressIntegrationInterface.defaults, options);
        this.$element = $(element);
        this.guid = guid;
        this.eventPrefix = '.addressIntegration'+this.guid;
        this.fullAddress = null;
        this.errors = null;
        this.lastValue;
        this.events = addPrefixesToEvents(this.settings.events, this.eventPrefix);
        if(!geocoder) {
            geocoder = new google.maps.Geocoder();
        }
        this.geocoder = geocoder;
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

    var getDataFromGoogleMaps = function (results, addressComponent, longOrShortName) {
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
            } else {
                $element.data('addressIntegrationStatus', 'empty');
            }
            $element
            .on( plugin.events, function() {
                $element.data('addressIntegrationStatus', 'event-fired');
                plugin.settings.callbackEventFired.apply(plugin);
            })
            .on( plugin.events,
                $.debounce( plugin.settings.throttleEventsTime, function() {
                    if( ($element.val() !== plugin.lastValue) || (plugin.errors in errorsMessages) ) {
                        plugin.checkAddress();
                    }
                })
            );
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
            var address = $element.val();
            plugin.showLoader();
            plugin.lastValue = $element.val();
            $element.data('addressIntegrationStatus', 'in-progress');
            if (callbackInProgress) { callbackInProgress.apply(plugin); }
            this.geocoder.geocode({ 'address': address }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    geocoder.geocode({'latLng': results[0].geometry.location}, function(results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {
                            if (results[1]) {
                                plugin.checkAddressSuccess(results, callbackSuccess);
                            } else {
                                plugin.checkAddressFail('NO_RESULTS', callbackError);
                            }
                        } else {
                            plugin.checkAddressFail(status, callbackError);
                        }
                    });
                } else {
                    plugin.checkAddressFail(status, callbackError);
                }
            });
        },
        checkAddressSuccess: function(results, callbackSuccess) {
            var plugin = this;
            var $element = this.$element;
            if(plugin.errors !== null) {
                plugin.errors = null;
                plugin.hideErrors();
            }
            plugin.fullAddress = results;
            plugin.hideLoader();
            plugin.setFields(plugin.fullAddress);
            $element.data('addressIntegrationStatus', 'success');
            if (callbackSuccess) { callbackSuccess.apply(plugin); }
        },
        checkAddressFail: function(errorMessage, callbackError) {
            var plugin = this;
            var $element = this.$element;
            plugin.errors = errorMessage;
            plugin.hideLoader();
            plugin.showErrors();
            if(plugin.settings.clearFieldsOnError) {
                plugin.clearFields();
            }
            $element.data('addressIntegrationStatus', 'fail');
            if (callbackError) { callbackError.apply(plugin); }
        },
        setFields: function(results) {
            var plugin = this;
            if (plugin.settings.countrySelector) { $(plugin.settings.countrySelector).val(getDataFromGoogleMaps(results, 'country', 'long_name')); }
            if (plugin.settings.countryShortSelector) { $(plugin.settings.countryShortSelector).val(getDataFromGoogleMaps(results, 'country', 'short_name')); }
            if (plugin.settings.citySelector) { $(plugin.settings.citySelector).val(getDataFromGoogleMaps(results, 'locality', 'long_name')); }
            if (plugin.settings.stateSelector) { $(plugin.settings.stateSelector).val(getDataFromGoogleMaps(results, 'administrative_area_level_1', 'long_name')); }
            if (plugin.settings.stateShortSelector) { $(plugin.settings.stateShortSelector).val(getDataFromGoogleMaps(results, 'administrative_area_level_1', 'short_name')); }
            if (plugin.settings.postalCodeSelector) { $(plugin.settings.postalCodeSelector).val(getDataFromGoogleMaps(results, 'postal_code', 'long_name')); }
            if (plugin.settings.routeSelector) { $(plugin.settings.routeSelector).val(getDataFromGoogleMaps(results, 'route', 'long_name')); }
            if (plugin.settings.streetNumberSelector) { $(plugin.settings.streetNumberSelector).val(getDataFromGoogleMaps(results, 'street_number', 'long_name')); }
        },
        clearFields: function(results) {
            var plugin = this;
            if (plugin.settings.countrySelector) { $(plugin.settings.countrySelector).val(""); }
            if (plugin.settings.countryShortSelector) { $(plugin.settings.countryShortSelector).val(""); }
            if (plugin.settings.citySelector) { $(plugin.settings.citySelector).val(""); }
            if (plugin.settings.stateSelector) { $(plugin.settings.stateSelector).val(""); }
            if (plugin.settings.stateShortSelector) { $(plugin.settings.stateShortSelector).val(""); }
            if (plugin.settings.postalCodeSelector) { $(plugin.settings.postalCodeSelector).val(""); }
            if (plugin.settings.routeSelector) { $(plugin.settings.routeSelector).val(""); }
            if (plugin.settings.streetNumberSelector) { $(plugin.settings.streetNumberSelector).val(""); }
        },
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
        hideErrors: function() {
            var plugin = this;
            $(plugin.settings.messageSelector).hide().empty();
        },
        showLoader: function() {
            var plugin = this;
            $(plugin.settings.loaderSelector).show();
        },
        hideLoader: function() {
            var plugin = this;
            $(plugin.settings.loaderSelector).hide();
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
        events:                  'propertychange change click keyup input paste',
        throttleEventsTime:      250, //debounce time for events
        countrySelector:         '#country', // can be set to false
        countryShortSelector:    '#country_short', // can be set to false
        citySelector:            '#city',  // can be set to false
        stateSelector:           '#state', // can be set to false
        stateShortSelector:      '#state_short', // can be set to false
        postalCodeSelector:      '#postal_code', // can be set to false
        routeSelector:           '#route', // can be set to false
        streetNumberSelector:    '#street_number', // can be set to false
        loaderSelector:          '#addressIntegrationLoader',
        messageSelector:         '#addressIntegrationMessages',
        customErrorMessage:      'No results for given data, the given place propably does not exist.',
        clearFieldsOnError:      false,
        callbackEventFired:      function() {  },
        callbackInProgress:      function() {  },
        callbackSuccess:         function() {  },
        callbackError:           function() {  }
    };

    $.fn.addressIntegration = addressIntegrationInterface;

})();