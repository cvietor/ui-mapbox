/**
 * Android Implementation
 *
 * @todo FIXME: The gcFix() implementation currently assumes only one map visible at a time.
 */

import { request } from '@nativescript-community/perms';
import { AndroidApplication, Application, Color, File, Trace, Utils, knownFolders, path } from '@nativescript/core';
import { AndroidActivityBundleEventData, AndroidActivityEventData } from '@nativescript/core/application/application-interfaces';
import { getImage } from '@nativescript/core/http';
import { GeoUtils } from './geo.utils';
import {
    AddExtrusionOptions,
    AddGeoJsonClusteredOptions,
    AddPolygonOptions,
    AddPolylineOptions,
    AddSourceOptions,
    AnimateCameraOptions,
    CLog,
    CLogTypes,
    DeleteOfflineRegionOptions,
    DownloadOfflineRegionOptions,
    Feature,
    LatLng,
    LayerCommon,
    ListOfflineRegionsOptions,
    MapStyle,
    MapboxApi,
    MapboxCommon,
    MapboxMarker,
    MapboxTraceCategory,
    MapboxViewBase,
    OfflineRegion,
    QueryRenderedFeaturesOptions,
    SetCenterOptions,
    SetTiltOptions,
    SetViewportOptions,
    SetZoomLevelOptions,
    ShowOptions,
    TrackUserOptions,
    UserLocation,
    UserLocationCameraMode,
    Viewport,
    telemetryProperty,
} from './mapbox.common';

// Export the enums for devs not using TS

export { MapboxTraceCategory, MapStyle };

// declare const android, com, java, org: any;

export namespace BundleKludge {
    export const bundle = { test: 'test' };
}

// ------------------------------------------------------------

/**
 * A map view created in XML.
 *
 * This is the class that is created when the Mapbox XML tag
 * is encountered while parsing a view.
 *
 * Angular components need to register the Mapbox tag as follows:
 *
 * import { registerElement } from "nativescript-angular/element-registry";
 * registerElement( "Mapbox", () => require("nativescript-mapbox").MapboxView);
 *
 * The registerElement call is what binds the XML tag to the class that creates it.
 *
 * @see MapboxViewBase
 */

export class MapboxView extends MapboxViewBase {
    // reference to the map view inside the frame.

    private nativeMapView: any; // com.mapbox.mapboxsdk.maps.MapView

    private settings: any = null;

    // private gcFixIndex: number;

    // whether or not the view has already been initialized.
    // see initNativeView()

    private initialized: boolean = false;

    constructor() {
        super();

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'constructor(): building new MapboxView object.');
        }

        // this.gcFixInit();
    }

    // ------------------------------------------------------

    /**
     * programmatically include settings
     *
     * @todo
     */

    setConfig(settings: any) {
        // zoom level is not applied unless center is set

        if (settings.zoomLevel && !settings.center) {
            // Eiffel tower, Paris
            settings.center = {
                lat: 48.858093,
                lng: 2.294694,
            };
        }

        this.settings = settings;
    }

    // ------------------------------------------------------

    /**
     * create a new entry in the global gc fix map.
     *
     * We may have multiple maps on a page.
     */

    // gcFixInit() {
    //     if (typeof global['MapboxView'] == 'undefined') {
    //         // this.gcFixIndex = 0;
    //         global['MapboxView'] = [{}];
    //     } else {
    //         global['MapboxView'].push({});
    //         // this.gcFixIndex = global['MapboxView'].length - 1;
    //     }

    //     if (Trace.isEnabled()) {
    //         CLog(CLogTypes.info, 'gcFixInit(): index is:', this.gcFixIndex);
    //     }
    // }

    // ------------------------------------------------------

    /**
     * add a reference to a global stack to prevent premature garbage collection
     *
     * As a performance improvement, the memory management "markingMode": "none"
     * can be enabled with the potential downside that the javascript and java
     * garbage collection systems get out of sync. This typically happens when a
     * javascript reference goes out of scope and the corresponding java object
     * is collected before it should be.
     *
     * To work around this, whenever we create some java object that's potentially
     * used in a closure, we keep a global reference to it to prevent it from
     * being garbage collected.
     *
     * This, of course, has the potential for causing memory leaks if we do not
     * correctly manage the stack.
     *
     * @param {string} key the key under which to store the reference. eg. android.widget.FrameLayout
     * @param {any} ref the object reference to store.
     */

    // gcFix(key: string, ref: any) {
    //     global['MapboxView'][// this.gcFixIndex][key] = ref;
    // }

    // ------------------------------------------------------

    /**
     * clear the gc preventation stack
     */

    // gcClear() {
    //     global['MapboxView'][// this.gcFixIndex] = null;
    // }

    // ------------------------------------------------------

    getNativeMapView(): any {
        return this.nativeMapView;
    }

    // ------------------------------------------------------

    /**
     * Return the Mapbox() API Shim instance
     *
     * This returns a reference to the Mapbox API shim class instance.
     * See class Mapbox below.
     *
     * @see Mapbox
     */

    public getMapboxApi(): any {
        return this.mapbox;
    }

    // -------------------------------------------------------

    /**
     * Creates the native view.
     *
     * This method is supposed to create the native view. NativeScript caches
     * and re-uses views to save on memory and increase performance. Unfortunately,
     * the inner details of exactly how this is done is challenging to tease apart.
     *
     * The problem is that in order to create the Mapbox view we need the access token from
     * the XML, but in the case of a pure NativeScript app with property binding
     * (see the demo), the properties don't seem to be available until the page is loaded.
     *
     * As a workaround, I wait until the page is loaded to configure the map. See initNativeView.
     *
     * It seems to me there should be a better way.
     *
     * @link https://docs.nativescript.org/core-concepts/properties#views-lifecycle-and-recycling
     *
     * @todo check this.
     */
    public createNativeView(): Object {
   
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'createNativeView(): top');
        }

        const nativeView = new android.widget.FrameLayout(this._context);

        // this.gcFix('android.widget.FrameLayout', nativeView);

        /*

    theMap.mapboxMap.setOnInfoWindowClickListener(
      new com.mapbox.mapboxsdk.maps.MapboxMap.OnInfoWindowClickListener({
        onInfoWindowClick: (marker) => {
          let cachedMarker = _getClickedMarkerDetails(marker);
          if (cachedMarker && cachedMarker.onCalloutTap) {
            cachedMarker.onCalloutTap(cachedMarker);
          }
          return true;
        }
      })
    );

    const iconFactory = com.mapbox.mapboxsdk.annotations.IconFactory.getInstance(Application.android.context);

    // if any markers need to be downloaded from the web they need to be available synchronously, so fetch them first before looping

    _downloadMarkerImages(markers).then( updatedMarkers => {
      for (let m in updatedMarkers) {
        let marker: any = updatedMarkers[m];
        _markers.push(marker);
        let markerOptions = new com.mapbox.mapboxsdk.annotations.MarkerOptions();
        markerOptions.setTitle(marker.title);
        markerOptions.setSnippet(marker.subtitle);
        markerOptions.setPosition(new com.mapbox.mapboxsdk.geometry.LatLng(parseFloat(marker.lat), parseFloat(marker.lng)));

        if (marker.icon) {
          // for markers from url see UrlMarker in https://github.com/mapbox/mapbox-gl-native/issues/5370
          if (marker.icon.startsWith("res://")) {
            let resourceName = marker.icon.substring(6);
            let res = utils.ad.getApplicationContext().getResources();
            let identifier = res.getIdentifier(resourceName, "drawable", utils.ad.getApplication().getPackageName());
            if (identifier === 0) {
              console.log(`No icon found for this device density for icon ' ${marker.icon}'. Falling back to the default icon.`);
            } else {
              markerOptions.setIcon(iconFactory.fromResource(identifier));
            }
          } else if (marker.icon.startsWith("http")) {
            if (marker.iconDownloaded !== null) {
              markerOptions.setIcon(iconFactory.fromBitmap(marker.iconDownloaded));
            }
          } else {
            if (Trace.isEnabled()) {
    CLog(CLogTypes.info, "Please use res://resourceName, http(s)://imageUrl or iconPath to use a local path");
}
          }

          marker.update = (newSettings: MapboxMarker) => {
            for (let m in _markers) {
              let _marker: MapboxMarker = _markers[m];
              if (marker.id === _marker.id) {

                if (newSettings.onTap !== undefined) {
                  _marker.onTap = newSettings.onTap;
                }

                if (newSettings.onCalloutTap !== undefined) {
                  _marker.onCalloutTap = newSettings.onCalloutTap;
                }

                if (newSettings.title !== undefined) {
                  _marker.title = newSettings.title;
                  _marker.android.setTitle(newSettings.title);
                }

                if (newSettings.subtitle !== undefined) {
                  _marker.subtitle = newSettings.title;
                  _marker.android.setSnippet(newSettings.subtitle);
                }

                if (newSettings.lat && newSettings.lng) {
                  _marker.lat = newSettings.lat;
                  _marker.lng = newSettings.lng;
                  _marker.android.setPosition(new com.mapbox.mapboxsdk.geometry.LatLng(parseFloat(<any>newSettings.lat), parseFloat(<any>newSettings.lng)));
                }

                if (newSettings.selected) {
                  theMap.mapboxMap.selectMarker(_marker.android);
                }
              }
            }
          };
        }
      } // end of for loop
    }); // end of _downloadMarkerImages()

*/

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'createNativeView(): bottom');
        }

        return nativeView;
    }

    // -------------------------------------------------------

    public onLoaded() {
        super.onLoaded();
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'onLoaded()');
        }

        if (!this.initialized) {
            this.initMap();
            this.initialized = true;
        }
    }
    public initNativeView(): void {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'initNativeView(): top');
        }
        this.nativeView.owner = this;
        super.initNativeView();
    }

    // -------------------------------------------------------

    /**
     * when the view is destroyed.
     *
     * This is called by the framework when the view is actually destroyed.
     * NativeScript, by design, tries to cache native views because
     * creating native views is expensive.
     *
     * @link https://docs.nativescript.org/plugins/ui-plugin-custom
     */

    async disposeNativeView(): Promise<void> {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'disposeNativeView(): top');
        }

        this.nativeView.owner = null;

        await this.mapbox.destroy();

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'disposeNativeView(): after mapbox.destroy()');
        }

        // this.gcClear();

        super.disposeNativeView();

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'disposeNativeView(): bottom');
        }
    }

    // -------------------------------------------------------------------------------------------

    /**
     * initialize the map
     *
     * This method creates a new mapbox API instance and, through the show() method of the Mapbox API,
     * creates a Mapbox native map view.
     *
     * @see show()
     *
     * @link https://docs.nativescript.org/core-concepts/events
     *
     * @todo FIXME: this.nativeMapView is unused and never actually set to anything.
     */

    private initMap(): void {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, "MapboxView:initMap(): top - accessToken is '" + this.config.accessToken + "'", this.config);
        }
        
        if (!this.nativeMapView && ((this.config && this.config.accessToken) || (this.settings && this.settings.accessToken))) {
            this.mapbox = new Mapbox();
            
        

            // the NativeScript contentview class extends from Observable to provide the notify method
            // which is the glue that joins this code with whatever callbacks are set in the Mapbox XML
            // tag describing the map.

            const options = {
                context: this._context,
                parentView: this.nativeView,
                onLocationPermissionGranted: (event) => {
                    this.notify({
                        eventName: MapboxViewBase.locationPermissionGrantedEvent,
                        object: this,
                        map: this,
                        android: this.nativeMapView,
                    });
                },
                onLocationPermissionDenied: (event) => {
                    this.notify({
                        eventName: MapboxViewBase.locationPermissionDeniedEvent,
                        object: this,
                        map: this,
                        android: this.nativeMapView,
                    });
                },
                onMapReady: (map) => {
                    if (this.telemetry === false) {
                        try{
                            com.mapbox.mapboxsdk.Mapbox.getTelemetry().setUserTelemetryRequestState(false);
                            console.error('telemtry disabled!')
                        } catch(err) {
                            console.error('telemtry', err)
                        }
                    }
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'initMap(): onMapReady event - calling notify with the MapboxViewBase.mapReadyEvent');
                    }

                    if (this.hasListeners(MapboxViewBase.mapReadyEvent)) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'initMap(): onMapReady has listeners.');
                        }
                    } else {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'initMap(): onMapReady DOES NOT HAVE listeners.');
                        }
                    }

                    this.notify({
                        eventName: MapboxViewBase.mapReadyEvent,
                        object: this,
                        map: this,
                        android: this.nativeMapView,
                    });
                },
                onScrollEvent: (event) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'initMap(): onScrollEvent event');
                    }

                    this.notify({
                        eventName: MapboxViewBase.scrollEvent,
                        object: this,
                        event,
                        map: this,
                        android: this.nativeMapView,
                    });
                },
                onMoveBeginEvent: (event) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'initMap(): onMoveBeginEvent event');
                    }

                    this.notify({
                        eventName: MapboxViewBase.moveBeginEvent,
                        object: this,
                        event,
                        map: this,
                        android: this.nativeMapView,
                    });
                },
            }; // end of options

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'initMap(): this.config is:', this.config);
            }

            if (!this.settings) {
                this.settings = Mapbox.merge(this.config, Mapbox.defaults);
            } else {
                this.settings = Mapbox.merge(this.settings, Mapbox.defaults);
            }

            this.settings = Mapbox.merge(this.settings, options);

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'initMap(): before show.');
            }

            this.mapbox.show(this.settings);

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'initMap(): bottom.');
            }
        }
    }

    [telemetryProperty.setNative](value:boolean) {
        com.mapbox.mapboxsdk.Mapbox.getTelemetry().setUserTelemetryRequestState(value);
    }
} // end of class MapboxView

// ----------------------------------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

/**
 * A NativeScript shim for the Mapbox API.
 *
 * This implements a Typescript shim over the Native Mapbox GL Android API.
 *
 * It is created in one of two ways:
 *
 * - directly via let mapbox = new Mapbox(); mapbox.show( ... )
 * - via the Mapbox XML tag in which case a MapboxView object is created which hosts a reference to this class. (See MapboxView::getMapboxAPI())
 */

export class Mapbox extends MapboxCommon implements MapboxApi {
    // reference to the native mapbox API

    private _mapboxMapInstance: any;
    private _mapboxViewInstance: any;

    // keep track of the activity the map was created in so other spawned
    // activities don't cause unwanted side effects. See Android Activity Events below.

    private _activity: string;

    // the user location component

    private _locationComponent: any = false;

    /**
     * the permissionsManager
     *
     * @link https://docs.mapbox.com/android/core/overview/#permissionsmanager
     */

    // access token

    private _accessToken: string = '';

    // annotation managers.

    private circleManager: any = null;
    private lineManager: any = null;
    private symbolManager: any = null;

    private _offlineManager: any;

    // event listeners

    private onDidFailLoadingMapListener;
    private onDidFinishLoadingMapListener;
    private onMapReadyCallback;
    private onDidFinishLoadingStyleListener;
    private onAnnotationClickListener;
    private onMapClickListener;
    private onMapLongClickListener;
    private onMoveListener;
    private onScrollListener;
    private onFlingListener;
    private onCameraMoveListener;
    private onCameraMoveCancelListener;
    private onCameraIdleListener;
    private onLocationClickListener;

    private _markers = [];
    private _polylines = [];
    private _polygons = [];

    // list of circle layers

    private circles: any = [];

    // list of polylines

    private lines: any = [];

    // registered callbacks.

    private eventCallbacks: any[] = [];

    _markerIconDownloadCache = [];

    // --------------------------------------------------------------------

    constructor() {
        super();

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'constructor(): building new Mapbox object.');
        }

        this.eventCallbacks['click'] = [];

        this._activity = Application.android.foregroundActivity;

        // When we receive events from Android we need to inform the API.
        //
        // start

        Application.android.on(AndroidApplication.activityStartedEvent, (args: AndroidActivityEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor: activityStartedEvent Event: ' + args.eventName + ', Activity: ' + args.activity);
            }

            if (this._mapboxViewInstance && this._activity === args.activity) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'constructor(): calling onStart()');
                }

                this._mapboxViewInstance.onStart();
            }
        });

        // pause

        Application.android.on(AndroidApplication.activityPausedEvent, (args: AndroidActivityEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor:: activityPausedEvent Event: ' + args.eventName + ', Activity: ' + args.activity);
            }

            if (this._mapboxViewInstance && this._activity === args.activity) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'constructor(): calling onPause()');
                }

                this._mapboxViewInstance.onPause();
            }
        });

        // resume

        Application.android.on(AndroidApplication.activityResumedEvent, (args: AndroidActivityEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor: activityResumedEvent Event: ' + args.eventName + ', Activity: ' + args.activity);
            }

            if (this._mapboxViewInstance && this._activity === args.activity) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'constructor(): calling onResume() - destroyed flag is:', this._mapboxViewInstance.isDestroyed());
                }

                this._mapboxViewInstance.onResume();
            }
        });

        // stop

        Application.android.on(AndroidApplication.activityStoppedEvent, (args: AndroidActivityEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor: activityStoppedEvent Event: ' + args.eventName + ', Activity: ' + args.activity);
            }

            if (this._mapboxViewInstance && this._activity === args.activity) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'constructor(): calling onStop()');
                }

                this._mapboxViewInstance.onStop();
            }
        });

        // destroy

        Application.android.on(AndroidApplication.activityDestroyedEvent, (args: AndroidActivityEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor: activityDestroyedEvent Event: ' + args.eventName + ', Activity: ' + args.activity);
            }

            if (this._activity === args.activity) {
                if (this.lineManager) {
                    this.lineManager.onDestroy();
                }

                if (this.circleManager) {
                    this.circleManager.onDestroy();
                }

                if (this.symbolManager) {
                    this.symbolManager.onDestroy();
                }

                if (this._mapboxViewInstance) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'constructor(): calling onDestroy()');
                    }

                    this._mapboxViewInstance.onDestroy();
                }
            }
        });

        // savestate

        Application.android.on(AndroidApplication.saveActivityStateEvent, (args: AndroidActivityBundleEventData) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'constructor: saveActivityStateEvent Event: ' + args.eventName + ', Activity: ' + args.activity + ', Bundle: ' + args.bundle);
            }

            if (this._mapboxViewInstance && this._activity === args.activity) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'constructor(): saving instance state');
                }

                this._mapboxViewInstance.onSaveInstanceState(args.bundle);
            }
        });

        // Application.android.on( AndroidApplication.activityResultEvent, ( args: AndroidActivityResultEventData ) => {
        //   console.log( "Mapbox::constructor: activityResultEvent Event: " + args.eventName + ", Activity: " + args.activity +
        //     ", requestCode: " + args.requestCode + ", resultCode: " + args.resultCode + ", Intent: " + args.intent);
        // });

        // Application.android.on( AndroidApplication.activityBackPressedEvent, ( args: AndroidActivityBackPressedEventData ) => {
        //   console.log( "Mapbox::constructor: activityBackPressedEvent Event: " + args.eventName + ", Activity: " + args.activity);
        //   // Set args.cancel = true to cancel back navigation and do something custom.
        // });

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'constructor(): end of Mapbox constructor.');
        }
    } // end of constructor

    // ------------------------------------------------------

    /**
     * add a reference to a global stack to prevent premature garbage collection
     *
     * @param {string} key the key under which to store the reference. eg. android.widget.FrameLayout
     * @param {any} ref the object reference to store.
     *
     * @see MapboxView::gcFix()
     */

    // gcFix(key: string, ref: any) {
    //     if (typeof global['Mapbox'] == 'undefined') {
    //         global['Mapbox'] = {};
    //     }

    //     global['Mapbox'][key] = ref;
    // }

    // ------------------------------------------------------

    /**
     * clear the gc preventation stack
     */

    gcClear() {
        global['Mapbox'] = {};
    }

    // ---------------------------------------------------------------------------------

    /**
     * not used
     */

    setMapboxViewInstance(mapboxViewInstance: any): void {}

    /**
     * not used
     */

    setMapboxMapInstance(mapboxMapInstance: any): void {}

    // ---------------------------------------------------------------------------------

    /**
     * show the map programmatically.
     *
     * This method is used to programmatically display a map. It is also called
     * by the MapboxView::init() method which initializes the map when the Mapbox
     * XML tags is encountered
     *
     * options may additionally include:
     *
     * - context
     * - parentView
     * - onLocationPermissionGranted
     * - onLocationPermissionDenied
     * - onMapReady
     *
     * @see MapboxView::init()
     *
     * @todo FIXME: the timeout delay before showing the map works around some race condition. The source error needs to be figured out.
     */

    show(options: ShowOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const settings = Mapbox.merge(options, Mapbox.defaults);

                const showIt = () => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'show()');
                    }

                    // if no accessToken was set the app may crash.
                    //
                    // FIXME: Even if using a local server add some string.

                    if (settings.accessToken === undefined) {
                        reject('mapbox_accesstoken_missing');
                        return;
                    }

                    // if already added, make sure it's removed first

                    if (this._mapboxViewInstance) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'show(): view already created. Removing it.');
                        }

                        const viewGroup = this._mapboxViewInstance.getParent();
                        if (viewGroup !== null) {
                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, 'show(): view already created. Removing _mapboxViewInstance child of view parent.');
                            }

                            viewGroup.removeView(this._mapboxViewInstance);
                        }
                    }

                    this._accessToken = settings.accessToken;

                    let context = Application.android.context;

                    if (settings.context) {
                        context = settings.context;
                    }

                    // Per the Mapbox Android Native samples:
                    //
                    // "Mapbox access token is configured here. This needs to be called either in your application
                    // object or in the same activity which contains the mapview."

                    com.mapbox.mapboxsdk.Mapbox.getInstance(context, this._accessToken);

                    const mapboxMapOptions = this._getMapboxMapOptions(settings);

                    // unlike the Mapbox Android Native samples, we are not laying the map out
                    // using the Android XML layout features. Instead, we are creating the map
                    // programmatically.

                    this._mapboxViewInstance = new com.mapbox.mapboxsdk.maps.MapView(context, mapboxMapOptions);

                    // required per the Mapbox Android API.

                    this._mapboxViewInstance.onCreate(null);

                    // define some listeners to inform in case the map does not
                    // load.

                    if (Trace.isEnabled()) {
                        this.onDidFailLoadingMapListener = new com.mapbox.mapboxsdk.maps.MapView.OnDidFailLoadingMapListener({
                            onDidFailLoadingMap: (error) => CLog(CLogTypes.error, 'Mapbox::show(): failed to load map:', error),
                        });
                        this._mapboxViewInstance.addOnDidFailLoadingMapListener(this.onDidFailLoadingMapListener);
                    }

                    // this.gcFix('com.mapbox.mapboxsdk.maps.MapView.OnDidFailLoadingMapListener', this.onDidFailLoadingMapListener);

                    if (Trace.isEnabled()) {
                        this.onDidFinishLoadingMapListener = new com.mapbox.mapboxsdk.maps.MapView.OnDidFinishLoadingMapListener({
                            onDidFinishLoadingMap: () => CLog(CLogTypes.info, 'show(): finished loading map'),
                        });
                        this._mapboxViewInstance.addOnDidFinishLoadingMapListener(this.onDidFinishLoadingMapListener);
                    }

                    // this.gcFix('com.mapbox.mapboxsdk.maps.MapView.OnDidFinishLoadingMapListener', this.onDidFinishLoadingMapListener);

                    this.onMapReadyCallback = new com.mapbox.mapboxsdk.maps.OnMapReadyCallback({
                        onMapReady: (mbMap) => {
                            this._mapboxMapInstance = mbMap;

                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, 'show(): onMapReady() with instance:', this._mapboxMapInstance);
                            }

                            // Android SDK 7.0.0 and on requires that the style be set separately after the map
                            // is initialized. We do not consider the map ready until the style has successfully
                            // loaded.

                            this.setMapStyle(settings.style).then((style) => {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.info, 'show(): style loaded.');
                                }

                                // initialize the event handlers now that we have a constructed view.

                                this.initEventHandlerShim(settings, this._mapboxViewInstance);

                                this._addMarkers(settings.markers, this._mapboxViewInstance);

                                if (settings.showUserLocation) {
                                    this.requestFineLocationPermission()
                                        .then(() => {
                                            this.showUserLocationMarker({});

                                            // if we have a callback defined, call it.

                                            if (settings.onLocationPermissionGranted) {
                                                settings.onLocationPermissionGranted(this._mapboxMapInstance);
                                            }
                                        })
                                        .catch((err) => {
                                            if (settings.onLocationPermissionDenied) {
                                                settings.onLocationPermissionDenied(this._mapboxMapInstance);
                                            }
                                        });
                                }

                                // if we have an onMapReady callback fire it.

                                if (settings.onMapReady) {
                                    settings.onMapReady(this._mapboxMapInstance);
                                }

                                resolve({
                                    android: this._mapboxViewInstance,
                                });
                            });
                        },
                    }); // end of onReady callback.

                    this._mapboxViewInstance.getMapAsync(this.onMapReadyCallback);

                    // this.gcFix('com.mapbox.mapboxsdk.maps.OnMapReadyCallback', this.onMapReadyCallback);

                    // mapView.onResume();

                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'show(): after getMapAsync()');
                    }

                    // we either have been given a view to add the map to or we
                    // add it to the top making it full screen.

                    if (settings.parentView) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'show(): adding map to passed in view');
                        }

                        settings.parentView.addView(this._mapboxViewInstance);
                    } else if (settings.container) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'show(): adding map to passed in container');
                        }

                        // Application.android.currentContext has been removed.

                        context = Application.android.foregroundActivity;

                        if (!context) {
                            context = Application.android.startActivity;
                        }

                        const mapViewLayout = new android.widget.FrameLayout(context);

                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'show(): before adding mapboxViewInstance to FrameLayout');
                        }

                        mapViewLayout.addView(this._mapboxViewInstance);

                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'show(): before adding FrameLayout to container');
                        }

                        settings.container.addChild(mapViewLayout);
                    }

                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'show(): showIt() bottom');
                    }
                }; // end of showIt()

                // FIXME: There is some initialization error. A short delay works around this.

                setTimeout(showIt, settings.delay ? settings.delay : 200);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.show: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of show()

    // ----------------------------------------------------------------------------------

    /**
     * hide the map
     */

    hide(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this._mapboxViewInstance) {
                    const viewGroup = this._mapboxViewInstance.getParent();
                    if (viewGroup !== null) {
                        viewGroup.setVisibility(android.view.View.INVISIBLE);
                    }
                }
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.hide: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    unhide(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this._mapboxViewInstance) {
                    this._mapboxViewInstance.getParent().setVisibility(android.view.View.VISIBLE);
                    resolve();
                } else {
                    reject('No map found');
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.unhide: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     * destroy the map programmatically
     *
     * Destroy the map instance.
     */

    destroy(nativeMap?: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            this.clearEventListeners();
            this.gcClear();

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'destroy(): destroying mapbox view.');
            }

            if (this.lineManager) {
                this.lineManager.onDestroy();
                this.lineManager = null;
            }

            if (this.circleManager) {
                this.circleManager.onDestroy();
                this.circleManager = null;
            }

            if (this.symbolManager) {
                this.symbolManager.onDestroy();
                this.symbolManager = null;
            }

            // if we have a location marker we need to disable it before destroying the map
            //
            // This is here to prevent a crash. The user code should disable/re-enable the
            // location marker.

            if (this._locationComponent) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'destroy(): Location marker not disabled before destroy() called.');
                }

                await this.hideUserLocationMarker();
            }

            if (this._mapboxViewInstance) {
                const viewGroup = this._mapboxViewInstance.getParent();
                if (viewGroup !== null) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'destroy(): removing _mapboxViewInstance view.');
                    }
                    viewGroup.removeView(this._mapboxViewInstance);
                }

                this._mapboxViewInstance.onPause();
                this._mapboxViewInstance.onStop();
                this._mapboxViewInstance.destroyDrawingCache();

                // let the API know that we're programmatically destroying the map.

                this._mapboxViewInstance.onDestroy();

                this._mapboxViewInstance = null;
                this._mapboxMapInstance = null;
            }

            resolve();
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     * Clear Event Listeners
     *
     * Explicitly clear all registered event listeners. It's not clear to me whether or not this
     * is strictly necessary as I imagine these should all get cleaned up when the map is destroyed
     * but given the complication of NativeScript's garbage collection scheme it seems like a good
     * idea to remove these handlers explicitly.
     */

    private clearEventListeners() {
        if (this.onDidFailLoadingMapListener) {
            this._mapboxViewInstance.removeOnDidFailLoadingMapListener(this.onDidFailLoadingMapListener);
            this.onDidFailLoadingMapListener = null;
        }

        if (this.onDidFinishLoadingMapListener) {
            this._mapboxViewInstance.removeOnDidFinishLoadingMapListener(this.onDidFinishLoadingMapListener);
            this.onDidFinishLoadingMapListener = null;
        }

        if (this.onDidFinishLoadingStyleListener) {
            this._mapboxViewInstance.removeOnDidFinishLoadingStyleListener(this.onDidFinishLoadingStyleListener);
            this.onDidFinishLoadingStyleListener = null;
        }

        if (this.onAnnotationClickListener) {
            this.lineManager.removeClickListener(this.onAnnotationClickListener);
            this.onAnnotationClickListener = null;
        }

        if (this.onDidFailLoadingMapListener) {
            this._mapboxViewInstance.removeOnDidFailLoadingMapListener(this.onDidFailLoadingMapListener);
            this.onDidFailLoadingMapListener = null;
        }

        if (this.onMapClickListener) {
            this._mapboxMapInstance.removeOnMapClickListener(this.onMapClickListener);
            this.onMapClickListener = null;
        }

        if (this.onMapLongClickListener) {
            this._mapboxMapInstance.removeOnMapLongClickListener(this.onMapLongClickListener);
            this.onMapLongClickListener = null;
        }

        if (this.onMoveListener) {
            this._mapboxMapInstance.removeOnMoveListener(this.onMoveListener);
            this.onMoveListener = null;
        }

        if (this.onScrollListener) {
            this._mapboxMapInstance.removeOnMoveListener(this.onScrollListener);
            this.onScrollListener = null;
        }

        if (this.onFlingListener) {
            this._mapboxMapInstance.removeOnFlingListener(this.onFlingListener);
            this.onFlingListener = null;
        }

        if (this.onCameraMoveListener) {
            this._mapboxMapInstance.removeOnCameraMoveListener(this.onCameraMoveListener);
            this.onCameraMoveListener = null;
        }

        if (this.onCameraMoveCancelListener) {
            this._mapboxMapInstance.removeOnCameraMoveCancelListener(this.onCameraMoveCancelListener);
            this.onCameraMoveCancelListener = null;
        }

        if (this.onCameraIdleListener) {
            this._mapboxMapInstance.removeOnCameraIdleListener(this.onCameraIdleListener);
            this.onCameraIdleListener = null;
        }

        if (this.onLocationClickListener) {
            this._locationComponent.removeOnLocationClickListener(this.onLocationClickListener);
            this.onLocationClickListener = null;
        }
    }

    // ------------------------------------------------
    // Life Cycle Hooks
    // ------------------------------------------------

    /**
     * on Start
     */

    onStart(nativeMap?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            // super.onStart();

            this._mapboxViewInstance.onStart();

            resolve();
        });
    }

    // ----------------------------------------------

    /**
     * on Resume
     */

    onResume(nativeMapViewInstance?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'onResume(): calling resume');
            }

            // super.onResume();

            this._mapboxViewInstance.onResume();

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'onResume(): after calling resume on nativeMap:', this._mapboxViewInstance);
            }

            resolve();
        });
    }

    // ----------------------------------------------

    /**
     * on Pause
     */

    onPause(nativeMapViewInstance?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'onPause(): calling pause');
            }

            // super.onPause();

            this._mapboxViewInstance.onPause();

            resolve();
        });
    }

    // ----------------------------------------------

    /**
     * on Stop
     */

    onStop(nativeMap?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            // super.onStop();

            this._mapboxViewInstance.onStop();

            resolve();
        });
    }

    // ----------------------------------------------

    /**
     * on Low Memory
     */

    onLowMemory(nativeMap?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            // super.onLowMemory();

            this._mapboxViewInstance.onLowMemory();

            resolve();
        });
    }

    // ----------------------------------------------

    /**
     * on Destroy
     */

    onDestroy(nativeMap?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            // super.onStart();

            this._mapboxViewInstance.onDestroy();

            resolve();
        });
    }

    // ---------------------------------------------

    // onSaveInstanceState( Bundle outState)

    // --------------------------------------------------------------------

    /**
     * event handler shim
     *
     * Initialize our event handler shim so that we can intercept events here.
     *
     * @param { any } settings
     * @param { MapboxView } mapboxView
     */

    initEventHandlerShim(settings, mapboxNativeViewInstance: any) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Mapbox:initEventHandlerShim(): top');
        }

        this.setOnMapClickListener((point: LatLng) => this.checkForCircleClickEvent(point), mapboxNativeViewInstance);

        this.setOnMoveBeginListener((point: LatLng) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Mapbox:initEventHandlerShim(): moveBegin:', point);
            }

            if (typeof settings.onMoveBeginEvent != 'undefined') {
                settings.onMoveBeginEvent(point);
            }
        }, mapboxNativeViewInstance);
    }

    // --------------------------------------------------------------------

    /**
     * register on click handlers.
     *
     * The native mapbox API does not, apparently, support click handlers
     * on circles, but it does for markers and polylines. WTF?
     *
     * Here we attempt to replicate the mapbox-gl-js behaviour of being
     * able to assign an onClick handler to a layer by it's layer id.
     *
     * @param {string} event - the event to subscribe to. i.e. 'click'.
     * @param {string} id - the id of the layer
     * @param {function} callback - the callback to invoke when the layer is clicked on.
     * @param {object] nativeMapView - reference to the native Map view.
     *
     * @link https://github.com/mapbox/mapbox-android-demo/issues/540
     */

    public onMapEvent(eventName, id, callback, nativeMapView?): void {
        if (typeof this.eventCallbacks[eventName] == 'undefined') {
            this.eventCallbacks[eventName] = [];
        }

        // is this event being added to a line?

        const lineEntry = this.lines.find((entry) => entry.id === id);

        if (lineEntry) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Mapbox:on(): we have a line entry:', lineEntry);
            }

            // we have a line layer. As mentioned, Mapbox line layers do not support
            // click handlers but Annotation plugin lines do (but they sadly do not
            // support the nice styling that Layer lines do ... )

            this.addClickableLineOverlay(lineEntry.id, nativeMapView).then((clickOverlay) => {
                lineEntry.clickOverlay = clickOverlay;

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, "Mapbox:on(): pushing id '" + id + "' with clickOverlay:", clickOverlay);
                }

                this.eventCallbacks[eventName].push({
                    id,
                    callback,
                });
            });
        } else {
            this.eventCallbacks[eventName].push({
                id,
                callback,
            });
        }
    }

    // ---------------------------------------------------------------

    /**
     * remove an event handler for a layer
     *
     * This will remove all event handlers (that we manage here) for
     * the given layer id and event.
     */

    public offMapEvent(eventName, id, nativeMapView?) {
        if (typeof this.eventCallbacks[eventName] == 'undefined') {
            return;
        }

        this.eventCallbacks[eventName] = this.eventCallbacks[eventName].filter((entry) => entry.id !== id);
    }

    // ------------------------------------------------------------------------

    /**
     * handles a line click event
     *
     * Given a click on a line overlay, find the id of the underlying line layer
     * an invoke any registered callbacks.
     */

    private handleLineClickEvent(clickOverlay) {
        const lineEntry = this.lines.find((entry) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, "Mapbox:handleLineClickEvent(): checking lineEntry clickOverlay id '" + entry.clickOverlay + "' against clickOverlay '" + clickOverlay + "'");
            }

            return entry.clickOverlay === clickOverlay;
        });

        if (!lineEntry) {
            console.error('Mapbox:handleLineClick(): click on overlay without an underlying line layer');
            return false;
        }

        for (let x = 0; x < this.eventCallbacks['click'].length; x++) {
            const entry = this.eventCallbacks['click'][x];

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, "Mapbox:handleLineClickEvent(): checking entry id '" + entry.id + "' against lineEnty id '" + lineEntry.id + "'");
            }

            if (entry.id === lineEntry.id) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, "Mapbox:handleLineClickEvent(): calling callback for '" + entry.id + "'");
                }

                return entry.callback(lineEntry);
            }
        } // end of for loop over events.

        return false;
    }

    // ------------------------------------------------------------------------

    /**
     * checks for a click event on a circle.
     *
     * For the moment we have to handle map click events long hand ourselves for circles.
     *
     * When we catch an event we'll check the eventHandlers map to see if the
     * given layer is listed. If it is we invoke it's callback.
     *
     * If there are multiple overlapping circles only the first one in the list will be called.
     *
     * We also check the location of the click to see if it's inside any
     * circles and raise the event accordingly.
     *
     * @todo detect the top circle in the overlapping circles case.
     */

    private checkForCircleClickEvent(point: LatLng) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Mapbox:checkForCircleClickEvent(): got click event with point:', point);
        }

        // is this point within a circle?

        for (let i = 0; i < this.circles.length; i++) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Mapbox:checkForCircleClickEvent(): checking circle with radius:', this.circles[i].radius);
            }

            if (GeoUtils.isLocationInCircle(point.lng, point.lat, this.circles[i].center[0], this.circles[i].center[1], this.circles[i].radius)) {
                if (Trace.isEnabled()) {
                    CLog(
                        CLogTypes.info,
                        "Mapbox:checkForCircleClickEvent() Point is in circle with id '" + this.circles[i].id + "' invoking callbacks, if any. Callback list is:",
                        this.eventCallbacks
                    );
                }

                for (let x = 0; x < this.eventCallbacks['click'].length; x++) {
                    const entry = this.eventCallbacks['click'][x];

                    if (entry.id === this.circles[i].id) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, "Mapbox:checkForCircleClickEvent(): calling callback for '" + entry.id + "'");
                        }

                        return entry.callback(point);
                    }
                } // end of for loop over events.
            }
        } // end of loop over circles.

        return false;
    } // end of checkForCircleClickEvent()

    // ------------------------------------------------------------------------

    /**
     * add Clickable Line Overlay
     *
     * As of this writing, Mapbox Layer lines do not support click handlers however
     * they do offer a nice array of styling options.
     *
     * Annotation plugin lines do support click handlers but have limited styling
     * options.
     *
     * To wedge click handler support onto Mapbox layer lines we overlay the line
     * with an invisible Annotation line and catch click events from that.
     *
     * @param {string} lineId id of lineLayer we are to draw the clickable annotation over..
     * @param {object} nativeMapView
     *
     * @return {Promise<void>} clickLine layer
     *
     * @link https://stackoverflow.com/questions/54795079/how-to-get-a-geometry-from-a-mapbox-gl-native-geojsonsource
     *
     * @todo we assume a geojson source for lines.
     * @todo ideally I'd like to pull the geometry out of the line instead of keeping a separate copy of the coordinates around.
     */

    private addClickableLineOverlay(lineId, nativeMapView?) {
        return new Promise((resolve, reject) => {
            try {
                // we need to get the line layer from the lines array.

                const lineEntry = this.lines.find((entry) => entry.id === lineId);

                if (!lineEntry) {
                    reject("No such line with id '" + lineId + "'");
                    return;
                }

                // we want to draw an invisible line of the same width.

                const width = lineEntry.layer.getLineWidth().getValue();

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, "Mapbox:addClickableLineOverlay(): we have a source line of width '" + width + "'");
                }

                // FIXME: for the moment we are carrying around the feature used to create the original line layer.
                //
                // Line Layer features do not have any properties as the properties are separately set in the layer.

                const feature = lineEntry.feature;

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addClickableLineOverlay(): after removing properties');
                }

                feature.addNumberProperty('line-opacity', new java.lang.Float(0));
                feature.addNumberProperty('line-width', width);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addClickableLineOverlay(): after updating feature');
                }

                // the create() method of the line manager requires a feature collection.

                const featureCollection = com.mapbox.geojson.FeatureCollection.fromFeature(feature);

                // this.gcFix('com.mapbox.geojson.FeatureCollection', featureCollection);

                const clickOverlay = this.lineManager.create(featureCollection).get(0);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addClickableLineOverlay(): after creating overlay:', clickOverlay);
                }

                // console.log( "Mapbox:addClickableLineOverlay(): got width '" + width + "' and sourceId '" + sourceId + "'" );
                //
                // let source = nativeMapView.mapboxMap.getStyle().getSource( sourceId );
                //
                // console.log( "Mapbox:addClickableLineOverlay(): got source:", source );
                //
                // let features = source.querySourceFeatures( null );
                //
                // console.log( "Mapbox:addClickableLineOverlay(): features are:", features.get(0).getGeometry() );

                resolve(clickOverlay);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'MapboxaddClickableLineOverlay error: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of addClickableLineOverylay()

    // ------------------------------------------------------------------------

    hasFineLocationPermission(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this._fineLocationPermissionGranted());
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.hasFineLocationPermission: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     * Request fine locaion permission
     *
     * @link https://docs.mapbox.com/android/core/overview/#permissionsmanager
     */

    async requestFineLocationPermission() {
        // previous impl was asking for always ???
        return request('location');

        // return new Promise((resolve, reject) => {

        //   console.log( "Mapbox::requestFineLocationPermission()" );

        //   if ( hasLocationPermissions() ) {
        //     resolve();
        //     return;
        //   }

        //   if ( ! isLocationEnabled ) {
        //     console.error( "Location Services are not turned on" );
        //     reject( "Location services are not turned on." );
        //     return;
        //   }

        //   // it seems the hasPermission return value here is always true under Android.

        //   requestLocationPermissions( true, "We use this permission to show you your current location." ).then( ( hasPermission ) => {

        //     console.log( "Mapbox::requestFineLocationPermission(): hasPermission is:", hasPermission );

        //     if ( hasLocationPermissions() ) {

        //       console.log( "Mapbox::requestFineLocationPermission(): permission granted." );
        //       resolve( true );
        //       return;
        //     } else {
        //       console.error( "Location Permission not granted.");
        //       reject( "Location Permission Not granted" );
        //       return;
        //     }

        //   });

        // });
    }

    // -------------------------------------------------------------------------

    /**
     * set the map style
     *
     * The 7.X version of the SDK uses a builder class for forming
     * URLs.
     *
     * NOTE: The style must be explicitly set using this method in the onMapReady() handler.
     *
     * @param {string | MapStyle } style - a style following the Mapbox style specification or a URL to a style.
     * @param {any} nativeMapViewInstance - native map view (com.mapbox.mapboxsdk.maps.MapView)
     *
     * @see MapboxViewCommonBase:setMapStyle()
     *
     * @link https://docs.mapbox.com/android/api/map-sdk/7.1.2/com/mapbox/mapboxsdk/maps/Style.Builder.html
     * @link https://docs.mapbox.com/android/api/map-sdk/7.1.2/com/mapbox/mapboxsdk/maps/MapboxMap.html#setStyle-java.lang.String-com.mapbox.mapboxsdk.maps.Style.OnStyleLoaded-
     */

    setMapStyle(style: string | MapStyle, nativeMapViewInstance?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const mapStyle = this._getMapStyle(style);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'setMapStyle(): with style:', style);
                }

                // callback for when the style is successfully loaded.
                this.onDidFinishLoadingStyleListener = new com.mapbox.mapboxsdk.maps.MapView.OnDidFinishLoadingStyleListener({
                    onDidFinishLoadingStyle: () => {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'Mapbox:setMapStyle(): style loaded');
                        }

                        // FIXME: now that the map is initialized and the style is loaded we can
                        // create the annotation managers that allow us to (hopefully) reliably
                        // receive events on lines

                        this.lineManager = new com.mapbox.mapboxsdk.plugins.annotation.LineManager(this._mapboxViewInstance, this._mapboxMapInstance, this._mapboxMapInstance.getStyle());

                        // FIXME: probably not necessary.

                        // this.gcFix('lineManager', this.lineManager);

                        this.onAnnotationClickListener = new com.mapbox.mapboxsdk.plugins.annotation.OnAnnotationClickListener({
                            onAnnotationClick: (line) => {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.info, 'Mapbox:setMapStyle(): click on line:', line);
                                }

                                this.handleLineClickEvent(line);

                                return true;
                            },
                        });

                        this.lineManager.addClickListener(this.onAnnotationClickListener);

                        // this.gcFix('com.mapbox.mapboxsdk.plugins.annotation.OnAnnotationClickListener', this.onAnnotationClickListener);

                        resolve();
                    }
                });

                this._mapboxViewInstance.addOnDidFinishLoadingStyleListener(this.onDidFinishLoadingStyleListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapView.OnDidFinishLoadingStyleListener', this.onDidFinishLoadingStyleListener);

                // callback if loading the style fails.

                this.onDidFailLoadingMapListener = new com.mapbox.mapboxsdk.maps.MapView.OnDidFailLoadingMapListener({
                    onDidFailLoadingMap: (error) => {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.error, 'Mapbox:setMapStyle(): style failed', mapStyle, error);
                        }
                        reject(error);
                    },
                });

                this._mapboxViewInstance.addOnDidFailLoadingMapListener(this.onDidFailLoadingMapListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapView.OnDidFailLoadingMapListener', this.onDidFailLoadingMapListener);

                const builder = new com.mapbox.mapboxsdk.maps.Style.Builder();

                this._mapboxMapInstance.setStyle(builder.fromUri(mapStyle));

                // FIXME: probably not necessary.

                // this.gcFix('com.mapbox.mapboxsdk.maps.Style.Builder', builder);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, 'Error in mapbox.setMapStyle', style, ex);
                }
                reject(ex);
            }
        });
    }

    // ------------------------------------------------------------------------------

    async addMarkers(markers: MapboxMarker[], nativeMap?: any) {
        try {
            this._addMarkers(markers, this._mapboxViewInstance);
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Error in mapbox.addMarkers: ' + ex);
            }
            throw (ex);
        }
    }

    // ----------------------------------------------------------------------------------

    async removeMarkers(ids?: any, nativeMap?: any) {
        try {
            this._removeMarkers(ids, this._mapboxViewInstance);
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Error in mapbox.removeMarkers: ' + ex);
            }
            throw (ex);
        }
    }

    // --------------------------------------------------------------------------------------------

    /**
     *
     * @deprecated
     * @link https://github.com/mapbox/mapbox-plugins-android/tree/master/plugin-annotation
     */

    _addMarkers(markers: MapboxMarker[], nativeMap?) {
        if (!markers) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'No markers passed');
            }
            return;
        }

        if (!Array.isArray(markers)) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, "markers must be passed as an Array: [{title:'foo'}]");
            }
            return;
        }

        if (!this._mapboxMapInstance) {
            return;
        }

        this._mapboxMapInstance.setOnMarkerClickListener(
            new com.mapbox.mapboxsdk.maps.MapboxMap.OnMarkerClickListener({
                onMarkerClick: (marker) => {
                    const cachedMarker = this._getClickedMarkerDetails(marker);
                    if (cachedMarker && cachedMarker.onTap) {
                        cachedMarker.onTap(cachedMarker);
                    }
                    return false;
                },
            })
        );

        this._mapboxMapInstance.setOnInfoWindowClickListener(
            new com.mapbox.mapboxsdk.maps.MapboxMap.OnInfoWindowClickListener({
                onInfoWindowClick: (marker) => {
                    const cachedMarker = this._getClickedMarkerDetails(marker);
                    if (cachedMarker && cachedMarker.onCalloutTap) {
                        cachedMarker.onCalloutTap(cachedMarker);
                    }
                    return true;
                },
            })
        );

        const iconFactory = com.mapbox.mapboxsdk.annotations.IconFactory.getInstance(Application.android.context);

        // if any markers need to be downloaded from the web they need to be available synchronously, so fetch them first before looping

        this._downloadMarkerImages(markers).then((updatedMarkers) => {
            for (const m in updatedMarkers) {
                const marker: any = updatedMarkers[m];
                this._markers.push(marker);
                const markerOptions = new com.mapbox.mapboxsdk.annotations.MarkerOptions();
                markerOptions.setTitle(marker.title);
                markerOptions.setSnippet(marker.subtitle);
                markerOptions.setPosition(new com.mapbox.mapboxsdk.geometry.LatLng(parseFloat(marker.lat), parseFloat(marker.lng)));

                if (marker.icon) {
                    // for markers from url see UrlMarker in https://github.com/mapbox/mapbox-gl-native/issues/5370
                    if (marker.icon.startsWith('res://')) {
                        const resourcename = marker.icon.substring(6);
                        const res = Utils.ad.getApplicationContext().getResources();
                        const identifier = res.getIdentifier(resourcename, 'drawable', Utils.ad.getApplication().getPackageName());
                        if (identifier === 0) {
                            console.log(`No icon found for this device density for icon ' ${marker.icon}'. Falling back to the default icon.`);
                        } else {
                            markerOptions.setIcon(iconFactory.fromResource(identifier));
                        }
                    } else if (marker.icon.startsWith('http')) {
                        if (marker.iconDownloaded !== null) {
                            markerOptions.setIcon(iconFactory.fromBitmap(marker.iconDownloaded));
                        }
                    } else {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'Please use res://resourcename, http(s)://imageurl or iconPath to use a local path');
                        }
                    }
                } else if (marker.iconPath) {
                    const iconFullPath =path.join(knownFolders.currentApp().path , marker.iconPath.replace('~/', ''));
                    // if the file doesn't exist the app will crash, so checking it
                    if (File.exists(iconFullPath)) {
                        // could set width, height, retina, see https://github.com/Telerik-Verified-Plugins/Mapbox/pull/42/files?diff=unified&short_path=1c65267, but that's what the marker.icon param is for..
                        markerOptions.setIcon(iconFactory.fromPath(iconFullPath));
                    } else {
                        console.log(`Marker icon not found, using the default instead. Requested full path: '" + ${iconFullPath}'.`);
                    }
                }
                marker.android = this._mapboxMapInstance.addMarker(markerOptions);

                if (marker.selected) {
                    this._mapboxMapInstance.selectMarker(marker.android);
                }

                marker.update = (newSettings: MapboxMarker) => {
                    for (const m in this._markers) {
                        const _marker: MapboxMarker = this._markers[m];
                        if (marker.id === _marker.id) {
                            if (newSettings.onTap !== undefined) {
                                _marker.onTap = newSettings.onTap;
                            }
                            if (newSettings.onCalloutTap !== undefined) {
                                _marker.onCalloutTap = newSettings.onCalloutTap;
                            }
                            if (newSettings.title !== undefined) {
                                _marker.title = newSettings.title;
                                _marker.android.setTitle(newSettings.title);
                            }
                            if (newSettings.subtitle !== undefined) {
                                _marker.subtitle = newSettings.title;
                                _marker.android.setSnippet(newSettings.subtitle);
                            }
                            if (newSettings.lat && newSettings.lng) {
                                _marker.lat = newSettings.lat;
                                _marker.lng = newSettings.lng;
                                _marker.android.setPosition(new com.mapbox.mapboxsdk.geometry.LatLng(parseFloat((newSettings as any).lat), parseFloat((newSettings as any).lng)));
                            }
                            if (newSettings.selected) {
                                this._mapboxMapInstance.selectMarker(_marker.android);
                            }
                        }
                    }
                };
            }
        });
    } // end of _addMarkers()

    // --------------------------------------------------------------------------------------------

    /**
     *
     * @deprecated
     */

    _removeMarkers(ids?, nativeMap?) {
        if (!this._mapboxMapInstance) {
            return;
        }

        for (const m in this._markers) {
            const marker = this._markers[m];
            if (!ids || (marker && marker.id && ids.indexOf(marker.id) > -1)) {
                if (marker && marker.android) {
                    this._mapboxMapInstance.removeAnnotation(marker.android);
                }
            }
        }
        // remove markers from cache
        if (ids) {
            this._markers = this._markers.filter((marker) => ids.indexOf(marker.id) === -1);
        } else {
            this._markers = [];
        }
    }

    // ----------------------------------------------------------------------------------

    setCenter(options: SetCenterOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const cameraPosition = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder().target(new com.mapbox.mapboxsdk.geometry.LatLng(options.lat, options.lng)).build();

                // FIXME: Probably not necessary.

                // this.gcFix('com.mapbox.mapboxsdk.camera.CameraPosition.Builder', cameraPosition);

                if (options.animated === true) {
                    const newCameraPosition = com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition(cameraPosition);

                    this._mapboxMapInstance.animateCamera(newCameraPosition, 1000, null);

                    // this.gcFix('com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition', newCameraPosition);
                } else {
                    this._mapboxMapInstance.setCameraPosition(cameraPosition);
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setCenter: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    getCenter(nativeMap?): Promise<LatLng> {
        return new Promise((resolve, reject) => {
            try {
                const coordinate = this._mapboxMapInstance.getCameraPosition().target;

                resolve({
                    lat: coordinate.getLatitude(),
                    lng: coordinate.getLongitude(),
                });
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getCenter: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setZoomLevel(options: SetZoomLevelOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const animated = options.animated === undefined || options.animated;
                const level = options.level;

                if (level >= 0 && level <= 20) {
                    const cameraUpdate = com.mapbox.mapboxsdk.camera.CameraUpdateFactory.zoomTo(level);

                    // FIXME: probably not necessary

                    // this.gcFix('com.mapbox.mapboxsdk.camera.CameraUpdateFactory.zoomTo', cameraUpdate);

                    if (animated) {
                        this._mapboxMapInstance.easeCamera(cameraUpdate);
                    } else {
                        this._mapboxMapInstance.moveCamera(cameraUpdate);
                    }
                    resolve();
                } else {
                    reject('invalid zoomlevel, use any double value from 0 to 20 (like 8.3)');
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setZoomLevel: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    getZoomLevel(nativeMap?): Promise<number> {
        return new Promise((resolve, reject) => {
            try {
                const level = this._mapboxMapInstance.getCameraPosition().zoom;
                resolve(level);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getZoomLevel: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setTilt(options: SetTiltOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const tilt = options.tilt ? options.tilt : 30;

                const cameraPositionBuilder = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder().tilt(tilt);

                // FIXME: probably not necessary

                // this.gcFix('com.mapbox.mapboxsdk.camera.CameraPosition.Builder', cameraPositionBuilder);

                const cameraUpdate = com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition(cameraPositionBuilder.build());

                // FIXME: probably not necessary

                // this.gcFix('com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition', cameraUpdate);

                const durationMs = options.duration ? options.duration : 5000;

                this._mapboxMapInstance.easeCamera(cameraUpdate, durationMs);

                setTimeout(() => {
                    resolve();
                }, durationMs);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setTilt: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    getTilt(nativeMap?): Promise<number> {
        return new Promise((resolve, reject) => {
            try {
                const tilt = this._mapboxMapInstance.getCameraPosition().tilt;
                resolve(tilt);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getTilt: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     * get users current location
     *
     * @link https://docs.mapbox.com/android/api/map-sdk/9.0.0/com/mapbox/mapboxsdk/location/LocationComponent.html#getLastKnownLocation--
     */

    getUserLocation(): Promise<UserLocation> {
        return new Promise((resolve, reject) => {
            try {
                const loc = this._locationComponent ? this._locationComponent.getLastKnownLocation() : null;

                if (loc === null) {
                    reject('Location not available');
                } else {
                    resolve({
                        location: {
                            lat: loc.getLatitude(),
                            lng: loc.getLongitude(),
                        },
                        speed: loc.getSpeed(),
                    });
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getUserLocation: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     *
     * @link https://www.mapbox.com/android-docs/api/mapbox-java/libjava-geojson/3.4.1/com/mapbox/geojson/Feature.html
     */

    queryRenderedFeatures(options: QueryRenderedFeaturesOptions, nativeMap?): Promise<Feature[]> {
        return new Promise((resolve, reject) => {
            try {
                const point = options.point;
                if (point === undefined) {
                    reject("Please set the 'point' parameter");
                    return;
                }

                const mapboxPoint = new com.mapbox.mapboxsdk.geometry.LatLng(options.point.lat, options.point.lng);
                const screenLocation = this._mapboxMapInstance.getProjection().toScreenLocation(mapboxPoint);

                if (this._mapboxMapInstance.queryRenderedFeatures) {
                    const features /* List<Feature> */ = this._mapboxMapInstance.queryRenderedFeatures(screenLocation, null, options.layerIds);
                    const result: Feature[] = [];
                    for (let i = 0; i < features.size(); i++) {
                        const feature = features.get(i);
                        result.push({
                            id: feature.id(),
                            type: feature.type(),
                            properties: JSON.parse(feature.properties().toString()),
                        });
                    }
                    resolve(result);
                } else {
                    reject('Feature not supported by this Mapbox version');
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.queryRenderedFeatures: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     *
     * @deprecated
     */

    addPolygon(options: AddPolygonOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const points = options.points;
                if (points === undefined) {
                    reject("Please set the 'points' parameter");
                    return;
                }

                const polygonOptions = new com.mapbox.mapboxsdk.annotations.PolygonOptions();
                for (const p in points) {
                    const point = points[p];
                    polygonOptions.add(new com.mapbox.mapboxsdk.geometry.LatLng(point.lat, point.lng));
                }

                polygonOptions.fillColor(Mapbox.getAndroidColor(options.fillColor));
                polygonOptions.alpha(options.fillOpacity === undefined ? 1 : options.fillOpacity);

                // Note that the stroke is barely visible, see https://github.com/mapbox/mapbox-gl-native/issues/5676
                if (options.strokeColor) {
                    polygonOptions.strokeColor(Mapbox.getAndroidColor(options.strokeColor));
                }
                this._polygons.push({
                    id: options.id || new Date().getTime(),
                    android: this._mapboxMapInstance.addPolygon(polygonOptions),
                });
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addPolygon: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     *
     * @deprecated
     */

    addPolyline(options: AddPolylineOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const points = options.points;
                if (points === undefined) {
                    reject("Please set the 'points' parameter");
                    return;
                }

                const polylineOptions = new com.mapbox.mapboxsdk.annotations.PolylineOptions();
                polylineOptions.width(options.width || 5); // default 5
                polylineOptions.color(Mapbox.getAndroidColor(options.color));
                polylineOptions.alpha(options.opacity === undefined ? 1 : options.opacity);
                for (const p in points) {
                    const point = points[p];
                    polylineOptions.add(new com.mapbox.mapboxsdk.geometry.LatLng(point.lat, point.lng));
                }
                this._polylines.push({
                    id: options.id || new Date().getTime(),
                    android: this._mapboxMapInstance.addPolyline(polylineOptions),
                });
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addPolyline: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    removePolygons(ids?: any[], nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                for (const p in this._polygons) {
                    const polygon = this._polygons[p];
                    if (!ids || (polygon.id && ids.indexOf(polygon.id) > -1)) {
                        this._mapboxMapInstance.removePolygon(polygon.android);
                    }
                }
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.removePolygons: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    removePolylines(ids?: any[], nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                for (const p in this._polylines) {
                    const polyline = this._polylines[p];
                    if (!ids || (polyline.id && ids.indexOf(polyline.id) > -1)) {
                        this._mapboxMapInstance.removePolyline(polyline.android);
                    }
                }
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.removePolylines: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    animateCamera(options: AnimateCameraOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const target = options.target;
                if (target === undefined) {
                    reject("Please set the 'target' parameter");
                    return;
                }

                const cameraPositionBuilder = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder(this._mapboxMapInstance.getCameraPosition()).target(
                    new com.mapbox.mapboxsdk.geometry.LatLng(target.lat, target.lng)
                );

                if (options.bearing) {
                    cameraPositionBuilder.bearing(options.bearing);
                }

                if (options.tilt) {
                    cameraPositionBuilder.tilt(options.tilt);
                }

                if (options.zoomLevel) {
                    cameraPositionBuilder.zoom(options.zoomLevel);
                }

                const durationMs = options.duration ? options.duration : 10000;

                this._mapboxMapInstance.animateCamera(com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition(cameraPositionBuilder.build()), durationMs, null);

                setTimeout(() => {
                    resolve();
                }, durationMs);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.animateCamera: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    /**
     * set an on map click listener.
     *
     * The new Mapbox Native SDK allows for multiple listeners on an event and follows the standard
     * pattern of returning 'true' when a handler has handled the event and others shouldn't.
     *
     * Not returning a boolean from the listener function will cause a crash.
     */

    setOnMapClickListener(listener: (data: LatLng) => boolean, nativeMap?: MapboxView): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onMapClickListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnMapClickListener({
                    onMapClick: (point) => {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'Mapbox:setOnMapClickListener(): click event at point:', point);
                        }

                        return listener({
                            lat: point.getLatitude(),
                            lng: point.getLongitude(),
                        });
                    },
                });

                this._mapboxMapInstance.addOnMapClickListener(this.onMapClickListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnMapClickListener', this.onMapClickListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnMapClickListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnMapLongClickListener(listener: (data: LatLng) => boolean, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onMapLongClickListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnMapLongClickListener({
                    onMapLongClick: (point) =>
                        listener({
                            lat: point.getLatitude(),
                            lng: point.getLongitude(),
                        }),
                });

                this._mapboxMapInstance.addOnMapLongClickListener(this.onMapLongClickListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnMapLongClickListener', this.onMapLongClickListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnMapLongClickListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnMoveBeginListener(listener: (data?: LatLng) => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'setOnMoveBeginListener():');
                }

                this.onMoveListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnMoveListener({
                    onMoveBegin: (detector: any /* MoveGestureDetector */) => {
                        const coordinate = this._mapboxMapInstance.getCameraPosition().target;
                        return listener({
                            lat: coordinate.getLatitude(),
                            lng: coordinate.getLongitude(),
                        });
                    },
                    onMove: (detector: any /* MoveGestureDetector */) => {},
                    onMoveEnd: (detector: any /* MoveGestureDetector */) => {},
                });

                this._mapboxMapInstance.addOnMoveListener(this.onMoveListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnMoveListener', this.onMoveListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnMoveBeginListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnScrollListener(listener: (data?: LatLng) => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'setOnScrollListener():');
                }

                // the 'onMove' event seems like the one closest to the iOS implementation

                this.onScrollListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnMoveListener({
                    onMoveBegin: (detector: any /* MoveGestureDetector */) => {},
                    onMove: (detector: any /* MoveGestureDetector */) => {
                        const coordinate = this._mapboxMapInstance.getCameraPosition().target;
                        return listener({
                            lat: coordinate.getLatitude(),
                            lng: coordinate.getLongitude(),
                        });
                    },
                    onMoveEnd: (detector: any /* MoveGestureDetector */) => {},
                });

                this._mapboxMapInstance.addOnMoveListener(this.onScrollListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnScrollListener', this.onScrollListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnScrollListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnFlingListener(listener: () => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onFlingListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnFlingListener({
                    onFling: () => listener(),
                });

                this._mapboxMapInstance.addOnFlingListener(this.onFlingListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnFlingListener', this.onFlingListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnFlingListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnCameraMoveListener(listener: () => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onCameraMoveListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraMoveListener({
                    onCameraMove: () => listener(),
                });

                this._mapboxMapInstance.addOnCameraMoveListener(this.onCameraMoveListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraMoveListener', this.onCameraMoveListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnCameraMoveListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnCameraMoveCancelListener(listener: () => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onCameraMoveCancelListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraMoveCanceledListener({
                    onCameraMoveCanceled: () => listener(),
                });

                this._mapboxMapInstance.addOnCameraMoveCancelListener(this.onCameraMoveCancelListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraMoveCanceledListener', this.onCameraMoveCancelListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnCameraMoveCancelListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    setOnCameraIdleListener(listener: () => void, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.onCameraIdleListener = new com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraIdleListener({
                    onCameraIdle: () => listener(),
                });

                this._mapboxMapInstance.addOnCameraIdleListener(this.onCameraIdleListener);

                // this.gcFix('com.mapbox.mapboxsdk.maps.MapboxMap.OnCameraIdleListener', this.onCameraIdleListener);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setOnCameraIdleListener: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    getViewport(nativeMap?): Promise<Viewport> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                const bounds = this._mapboxMapInstance.getProjection().getVisibleRegion().latLngBounds;

                resolve({
                    bounds: {
                        north: bounds.getLatNorth(),
                        east: bounds.getLonEast(),
                        south: bounds.getLatSouth(),
                        west: bounds.getLonWest(),
                    },
                    zoomLevel: this._mapboxMapInstance.getCameraPosition().zoom,
                });
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getViewport: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------------------------

    setViewport(options: SetViewportOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                const bounds = new com.mapbox.mapboxsdk.geometry.LatLngBounds.Builder()
                    .include(new com.mapbox.mapboxsdk.geometry.LatLng(options.bounds.north, options.bounds.east))
                    .include(new com.mapbox.mapboxsdk.geometry.LatLng(options.bounds.south, options.bounds.west))
                    .build();

                const padding = 25,
                    animated = options.animated === undefined || options.animated,
                    durationMs = animated ? 1000 : 0;

                if (animated) {
                    this._mapboxMapInstance.easeCamera(com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newLatLngBounds(bounds, padding), durationMs);
                } else {
                    this._mapboxMapInstance.moveCamera(com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newLatLngBounds(bounds, padding));
                }

                setTimeout(() => {
                    resolve();
                }, durationMs);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.setViewport: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------------------

    downloadOfflineRegion(options: DownloadOfflineRegionOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const styleURL = this._getMapStyle(options.style);

                const bounds = new com.mapbox.mapboxsdk.geometry.LatLngBounds.Builder()
                    .include(new com.mapbox.mapboxsdk.geometry.LatLng(options.bounds.north, options.bounds.east))
                    .include(new com.mapbox.mapboxsdk.geometry.LatLng(options.bounds.south, options.bounds.west))
                    .build();

                const retinaFactor = Utils.layout.getDisplayDensity();

                const offlineRegionDefinition = new com.mapbox.mapboxsdk.offline.OfflineTilePyramidRegionDefinition(styleURL, bounds, options.minZoom, options.maxZoom, retinaFactor);

                const info = '{name:"' + options.name + '"}';
                const infoStr = new java.lang.String(info);
                const encodedMetadata = infoStr.getBytes();

                if (!this._accessToken && !options.accessToken) {
                    reject("First show a map, or pass in an 'accessToken' param");
                    return;
                }
                if (!this._accessToken) {
                    this._accessToken = options.accessToken;
                    com.mapbox.mapboxsdk.Mapbox.getInstance(Application.android.context, this._accessToken);
                }

                this._getOfflineManager().createOfflineRegion(
                    offlineRegionDefinition,
                    encodedMetadata,
                    new com.mapbox.mapboxsdk.offline.OfflineManager.CreateOfflineRegionCallback({
                        onError: (error: string) => {
                            reject(error);
                        },

                        onCreate: (offlineRegion) => {
                            // if (options.onCreate) {
                            //   options.onCreate(offlineRegion);
                            // }

                            offlineRegion.setDownloadState(com.mapbox.mapboxsdk.offline.OfflineRegion.STATE_ACTIVE);

                            // Monitor the download progress using setObserver
                            offlineRegion.setObserver(
                                new com.mapbox.mapboxsdk.offline.OfflineRegion.OfflineRegionObserver({
                                    onStatusChanged: (status) => {
                                        // Calculate the download percentage and update the progress bar
                                        const percentage = status.getRequiredResourceCount() >= 0 ? (100.0 * status.getCompletedResourceCount()) / status.getRequiredResourceCount() : 0.0;

                                        if (options.onProgress) {
                                            options.onProgress({
                                                name: options.name,
                                                completedSize: status.getCompletedResourceSize(),
                                                completed: status.getCompletedResourceCount(),
                                                expected: status.getRequiredResourceCount(),
                                                percentage: Math.round(percentage * 100) / 100,
                                                // downloading: status.getDownloadState() == com.mapbox.mapboxsdk.offline.OfflineRegion.STATE_ACTIVE,
                                                complete: status.isComplete(),
                                            });
                                        }

                                        if (status.isComplete()) {
                                            resolve();
                                        } else if (status.isRequiredResourceCountPrecise()) {
                                        }
                                    },

                                    onError: (error) => {
                                        reject(`${error.getMessage()}, reason: ${error.getReason()}`);
                                    },

                                    mapboxTileCountLimitExceeded: (limit) => {
                                        console.log(`dl mapboxTileCountLimitExceeded: ${limit}`);
                                    },
                                })
                            );
                        },
                    })
                );
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.downloadOfflineRegion: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------------

    listOfflineRegions(options?: ListOfflineRegionsOptions): Promise<OfflineRegion[]> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._accessToken && !options.accessToken) {
                    reject("First show a map, or pass in an 'accessToken' param");
                    return;
                }
                if (!this._accessToken) {
                    this._accessToken = options.accessToken;
                    com.mapbox.mapboxsdk.Mapbox.getInstance(Application.android.context, this._accessToken);
                }

                this._getOfflineManager().listOfflineRegions(
                    new com.mapbox.mapboxsdk.offline.OfflineManager.ListOfflineRegionsCallback({
                        onError: (error: string) => {
                            reject(error);
                        },
                        onList: (offlineRegions) => {
                            const regions = [];
                            if (offlineRegions !== null) {
                                for (let i = 0; i < offlineRegions.length; i++) {
                                    const offlineRegion = offlineRegions[i];
                                    const name = this._getRegionName(offlineRegion);
                                    const offlineRegionDefinition = offlineRegion.getDefinition();
                                    const bounds = offlineRegionDefinition.getBounds();

                                    regions.push({
                                        name,
                                        style: offlineRegionDefinition.getStyleURL(),
                                        minZoom: offlineRegionDefinition.getMinZoom(),
                                        maxZoom: offlineRegionDefinition.getMaxZoom(),
                                        bounds: {
                                            north: bounds.getLatNorth(),
                                            east: bounds.getLonEast(),
                                            south: bounds.getLatSouth(),
                                            west: bounds.getLonWest(),
                                        },
                                    });
                                }
                            }
                            resolve(regions);
                        },
                    })
                );
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.listOfflineRegions: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------------------------

    deleteOfflineRegion(options: DeleteOfflineRegionOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!options || !options.name) {
                    reject("Pass in the 'name' param");
                    return;
                }

                this._getOfflineManager().listOfflineRegions(
                    new com.mapbox.mapboxsdk.offline.OfflineManager.ListOfflineRegionsCallback({
                        onError: (error: string) => {
                            reject(error);
                        },
                        onList: (offlineRegions) => {
                            const regions = [];
                            let found = false;
                            if (offlineRegions !== null) {
                                for (let i = 0; i < offlineRegions.length; i++) {
                                    const offlineRegion = offlineRegions[i];
                                    const name = this._getRegionName(offlineRegion);
                                    if (name === options.name) {
                                        found = true;
                                        offlineRegion.delete(
                                            new com.mapbox.mapboxsdk.offline.OfflineRegion.OfflineRegionDeleteCallback({
                                                onError: (error: string) => {
                                                    reject(error);
                                                },
                                                onDelete: () => {
                                                    resolve();
                                                    // don't return, see note below
                                                },
                                            })
                                        );
                                        // don't break the loop as there may be multiple packs with the same name
                                    }
                                }
                            }
                            if (!found) {
                                reject('Region not found');
                            }
                        },
                    })
                );
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.listOfflineRegions: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // -------------------------------------------------------------

    _getOfflineManager() {
        if (!this._offlineManager) {
            this._offlineManager = com.mapbox.mapboxsdk.offline.OfflineManager.getInstance(Application.android.context);
        }

        return this._offlineManager;
    }

    // ------------------------------------------------------------------------------------------------

    addExtrusion(options: AddExtrusionOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Create fill extrusion layer
                const fillExtrusionLayer = new com.mapbox.mapboxsdk.style.layers.FillExtrusionLayer('3d-buildings', 'composite');
                fillExtrusionLayer.setSourceLayer('building');
                fillExtrusionLayer.setFilter(com.mapbox.mapboxsdk.style.expressions.Expression.eq(com.mapbox.mapboxsdk.style.expressions.Expression.get('extrude'), 'true'));
                fillExtrusionLayer.setMinZoom(15);
                const props = [];
                props[0] = com.mapbox.mapboxsdk.style.layers.PropertyFactory.fillExtrusionColor(android.graphics.Color.LTGRAY);
                props[1] = com.mapbox.mapboxsdk.style.layers.PropertyFactory.fillExtrusionHeight(com.mapbox.mapboxsdk.style.expressions.Expression.get('height'));
                props[2] = com.mapbox.mapboxsdk.style.layers.PropertyFactory.fillExtrusionBase(com.mapbox.mapboxsdk.style.expressions.Expression.get('min_height'));
                props[3] = com.mapbox.mapboxsdk.style.layers.PropertyFactory.fillExtrusionOpacity(com.mapbox.mapboxsdk.style.expressions.Expression.literal(0.6));
                // Set data-driven styling properties
                fillExtrusionLayer.setProperties(props);

                this._mapboxMapInstance.addLayer(fillExtrusionLayer);
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addExtrusion: ' + ex);
                }
                reject(ex);
            }
        });
    }

    /**
     * add a geojson or vector source
     *
     * Add a source that can then be referenced in the style specification
     * passed to addLayer().
     *
     * @link https://docs.mapbox.com/mapbox-gl-js/api/#map#addsource
     */

    addSource(id: string, options: AddSourceOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const { url, type } = options;
                const theMap = nativeMap;
                let source;

                if (!theMap) {
                    reject('No map has been loaded');
                    return;
                }

                if (theMap.mapboxMap.getSource(id)) {
                    reject('Source exists: ' + id);
                    return;
                }

                switch (type) {
                    case 'vector':
                        source = new com.mapbox.mapboxsdk.style.sources.VectorSource(id, url);
                        break;

                    case 'geojson':
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'Mapbox:addSource(): before addSource with geojson');
                        }

                        const geojsonString = JSON.stringify(options.data);

                        const feature = com.mapbox.geojson.Feature.fromJson(geojsonString);

                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, 'Mapbox:addSource(): adding feature');
                        }

                        // com.mapbox.mapboxsdk.maps.Style

                        const geoJsonSource = new com.mapbox.mapboxsdk.style.sources.GeoJsonSource(id, feature);

                        this._mapboxMapInstance.getStyle().addSource(geoJsonSource);

                        // this.gcFix('com.mapbox.mapboxsdk.style.sources.GeoJsonSource', geoJsonSource);

                        // To support handling click events on lines and circles, we keep the underlying
                        // feature.
                        //
                        // FIXME: There should be a way to get the original feature back out from the source
                        // but I have not yet figured out how.

                        if (options.data.geometry.type === 'LineString') {
                            this.lines.push({
                                type: 'line',
                                id,
                                feature,
                            });
                        } else if (options.data.geometry.type === 'Point') {
                            // probably a circle

                            this.circles.push({
                                type: 'line',
                                id,
                                center: options.data.geometry.coordinates,
                            });
                        }

                        break;

                    default:
                        reject('Invalid source type: ' + type);
                        return;
                }

                if (!source) {
                    const ex = 'No source to add';
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Error in mapbox.addSource: ' + ex);
                    }
                    reject(ex);
                    return;
                }

                theMap.mapboxMap.addSource(source);
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addSource: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // -------------------------------------------------------------------------------------

    /**
     * remove source by id
     */

    removeSource(id: string, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const theMap = nativeMap;

                if (!theMap) {
                    reject('No map has been loaded');
                    return;
                }

                theMap.mapboxMap.removeSource(id);

                // if we've cached the underlying feature, remove it.
                //
                // since we don't know if it's a line or a circle we have to check both lists.

                let offset = this.lines.findIndex((entry) => entry.id === id);

                if (offset !== -1) {
                    this.lines.splice(offset, 1);
                }

                offset = this.circles.findIndex((entry) => entry.id === id);

                if (offset !== -1) {
                    this.circles.splice(offset, 1);
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.removeSource: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // -------------------------------------------------------------------------------------

    /**
     * a rough analogue to the mapbox-gl-js addLayer() method
     *
     * It would be nice if this {N} API matched the mapbox-gl-js API which
     * would make it much easier to share mapping applications between the web
     * and {N} apps.
     *
     * This method accepts a Mapbox-GL-JS style specification JSON object with some
     * limitations:
     *
     * - the source: must be a GeoJSON object, vector source definition, or an id of a source added via addSource()
     * - only a subset of paint properties are available.
     *
     * @param {object} style - a style following the Mapbox style specification.
     * @param {any} nativeMapView - native map view (com.mapbox.mapboxsdk.maps.MapView)
     *
     * @link https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers
     */

    public addLayer(style, nativeMapView?): Promise<void> {
        let retval;

        switch (style.type) {
            case 'line':
                retval = this.addLineLayer(style, nativeMapView);
                break;

            case 'circle':
                retval = this.addCircleLayer(style, nativeMapView);
                break;

            default:
                retval = Promise.reject("Mapbox:addLayer() Unsupported geometry type '" + style.type + "'");

                break;
        }

        return retval;
    }

    // -----------------------------------------------------------------------

    /**
     * remove layer by ID
     *
     * Removes a layer given a layer id
     *
     * @param {string} id
     */

    public async removeLayer(id: string, nativeMapViewInstance) {
        this._mapboxMapInstance.getStyle().removeLayer(id);
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Mapbox:removeLayer(): after removing layer');
        }
    } // end of removeLayer()

    // -------------------------------------------------------------------------------------

    /**
     * add a line layer
     *
     * Draws a line layer based on a mapbox-gl-js Mapbox Style.
     *
     * What sucks about this is that there is apparently no facility to add an event listener to a layer.
     *
     * The idea for this method is to make sharing code between mapbox-gl-js Typescript web applications
     * and {N} native applications easier.
     *
     * For the moment this method only supports a source type of 'geojson' or a source by id added
     * by addSource().
     *
     * Example style for a line:
     *
     * {
     * 'id': someid,
     * 'type': 'line',
     * 'source': {
     *   'type': 'geojson',
     *   'data': {
     *     "type": "Feature",
     *     "geometry": {
     *       "type": "LineString",
     *         "coordinates": [ [ lng, lat ], [ lng, lat ], ..... ]
     *       }
     *     }
     *   }
     * },
     * 'layout': {
     *   'line-cap': 'round',
     *   'line-join': 'round'
     * },
     * 'paint': {
     *   'line-color': '#ed6498',
     *   'line-width': 5,
     *   'line-opacity': .8,
     *   'line-dash-array': [ 1, 1, 1, ..]
     * }
     *
     * Do not call this method directly. Use addLayer().
     *
     * 'source' may also refer to a vector source
     *
     * 'source': {
     *    'type': 'vector',
     *    'url': '<url of vector source>'
     *  }
     *
     * or it may be a string referring to the id of an already added source as in
     *
     * 'source': '<id of source>'
     *
     * To enable catching of click events on a line, when a click handler is added
     * to a line (using the onMapEvent() method above), the Annotations plugin is used to
     * draw an invisible clickable line over the line layer. Sadly, the Annotations
     * plugin does not support all the nice styling options of the line Layer so we're
     * pushed into this compromise of drawing two lines, one for it's styling and the
     * other for it's click handling.
     *
     * @param {object} style - a style following the Mapbox style specification.
     * @param {any} nativeMapView - native map view (com.mapbox.mapboxsdk.maps.MapView)
     *
     * @return {Promise<void>}
     *
     * @see addLineAnnotation()
     * @see onMapEvent()
     *
     * @link https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers
     * @link https://docs.mapbox.com/android/api/map-sdk/7.1.2/com/mapbox/mapboxsdk/maps/Style.html#addSource-com.mapbox.mapboxsdk.style.sources.Source-
     * @link https://docs.nativescript.org/core-concepts/android-runtime/marshalling/java-to-js#array-of-primitive-types
     */

    private addLineLayer(style, nativeMapViewInstance?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (style.type !== 'line') {
                    reject('Non line style passed to addLineLayer()');
                }

                // the source may be of type geojson, vector,  or it may be the id of a source added by addSource().

                let sourceId = null;

                if (typeof style.source != 'string') {
                    sourceId = style.id + '_source';

                    this.addSource(sourceId, style.source);
                } else {
                    sourceId = style.source;
                }

                const line = new com.mapbox.mapboxsdk.style.layers.LineLayer(style.id, sourceId);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineLayer(): after LineLayer');
                }

                let lineProperties = [];

                // some defaults if there's no paint property to the style
                //
                // NOTE polyline styles have separate paint and layout sections.

                if (typeof style.paint == 'undefined') {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Mapbox:addLineLayer(): paint is undefined');
                    }

                    lineProperties = [
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineColor('red'),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineWidth(new java.lang.Float(7)),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineOpacity(new java.lang.Float(1)),
                    ];
                } else {
                    // color

                    if (style.paint['line-color']) {
                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineColor(style.paint['line-color']));
                    }

                    // opacity

                    if (style.paint['line-opacity']) {
                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineOpacity(new java.lang.Float(style.paint['line-opacity'])));
                    }

                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Mapbox:addLineLayer(): after opacity');
                    }

                    // line width

                    if (style.paint['line-width']) {
                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineWidth(new java.lang.Float(style.paint['line-width'])));
                    }

                    // line dash array

                    if (style.paint['line-dash-array']) {
                        // the line-dash-array requires some handstands to marhall it into a java Float[] type.

                        const dashArray = Array.create('java.lang.Float', style.paint['line-dash-array'].length);

                        for (let i = 0; i < style.paint['line-dash-array'].length; i++) {
                            dashArray[i] = new java.lang.Float(style.paint['line-dash-array'][i]);
                        }

                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineDasharray(dashArray));
                    }
                } // end of paint section.

                // now the layout section
                const Property = com.mapbox.mapboxsdk.style.layers.Property;
                if (typeof style.layout == 'undefined') {
                    lineProperties = [
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
                    ];
                } else {
                    // line cap
                    //
                    // FIXME: Add other styles.

                    if (style.layout['line-cap']) {
                        let property: any;

                        switch (style.layout['line-cap']) {
                            case 'round':
                                property = Property.LINE_CAP_ROUND;

                                break;

                            case 'square':
                                property = Property.LINE_CAP_SQUARE;

                                break;
                            case 'butt':
                                property = Property.LINE_CAP_BUTT;

                                break;
                        }

                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineCap(property));
                    }

                    // line join.

                    if (style.layout['line-join']) {
                        let property: any;

                        switch (style.layout['line-join']) {
                            case 'round':
                                property = Property.LINE_JOIN_ROUND;
                                break;
                            case 'miter':
                                property = Property.LINE_JOIN_MITER;
                                break;
                            case 'bevel':
                                property = Property.LINE_JOIN_BEVEL;
                                break;
                        }

                        lineProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.lineJoin(property));
                    }
                } // end of else there was a layout section.

                line.setProperties(lineProperties);

                this._mapboxMapInstance.getStyle().addLayer(line);

                // In support for clickable GeoJSON features.
                //
                // FIXME: for the moment, because I have not been able to figure out how to pull the geometry
                // from the source, we keep a reference to the feature so we can draw the clickable line when
                // a click handler is added. This is only supported on GeoJSON features.
                //
                // see addSource()

                const lineEntry = this.lines.find((entry) => entry.id === sourceId);

                if (lineEntry) {
                    lineEntry.layer = line;
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineLayer(): after addLayer');
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineLayer() Error : ' + ex);
                }
                reject(ex);
            }
        }); // end of Promise()
    } // end of addLineLayer

    // -------------------------------------------------------------------------------------

    /**
     * Add a point to a line
     *
     * This method appends a point to a line and is useful for drawing a users track.
     *
     * @param {id} id - id of line to add a point to.
     * @param {array} lnglat - [lng,lat] to append to the line.
     *
     * @link https://github.com/mapbox/mapbox-gl-native/issues/13983
     * @link https://docs.mapbox.com/android/api/mapbox-java/libjava-geojson/3.0.1/com/mapbox/geojson/Feature.html#Feature--
     * @link https://docs.oracle.com/javase/8/docs/api/java/util/List.html
     *
     * @todo this does not update the invisible clickable overlay.
     */

    public addLinePoint(id: string, lnglat, nativeMapView?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // This only works for GeoJSON features.
                //
                // The original thought was to query the source to get the points that make up the line
                // and then add a point to it. Unfortunately, it seems that the points in the source
                // are modified and do not match the original set of points that make up the map. I kept
                // adding a LineString and after querying it it would be returned as a MultiLineString
                // with more points.
                //
                // As a result of this, we keep the original feature in the lines list and use that
                // as the data source for the line. As each point is added, we append it to the
                // feature and reset the json source for the displayed line.

                const lineEntry = this.lines.find((entry) => entry.id === id);

                if (!lineEntry) {
                    reject("No such line layer '" + id + "'");
                    return;
                }

                const geometry = lineEntry.feature.geometry();

                const coordinates = geometry.coordinates();

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLinePoint(): adding point:', lnglat);
                }

                // see https://docs.oracle.com/javase/8/docs/api/java/util/List.html

                const newPoint = com.mapbox.geojson.Point.fromLngLat(lnglat[0], lnglat[1]);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLinePoint(): newPoint is:', newPoint);
                }

                geometry.coordinates().add(newPoint);

                // sadly it appears we have to recreate the feature. The old feature should get
                // culled by garbage collection.

                lineEntry.feature = com.mapbox.geojson.Feature.fromGeometry(geometry);

                // now reset the source

                const lineSource = this._mapboxMapInstance.getStyle().getSource(id + '_source');

                lineSource.setGeoJson(lineEntry.feature);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLinePoint(): after updating lineSource feature');
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLinePoint() Error : ' + ex);
                }
                reject(ex);
            }
        });
    } // end of addLinePoint()

    // -------------------------------------------------------------------------------------

    /**
     * add a circle Layer
     *
     * Draw a circle based on a Mapbox style.
     *
     * Mapbox Native Android layers do not support click handlers. Unfortunately, we cannot use
     * the same Annotations approach that we do for lines to get a click handler because
     * circles drawn by the Annotations plugin do not support stops so there's no making them
     * smaller as we zoom out. Instead, we have our own click handler (see handleClickEvent() above)
     * to determine when a click has occured inside a circle.
     *
     * In order to support the click handler an additional circle-radius property, in meters, must
     * be included.
     *
     * {
     *  "id": someid,
     *  "type": 'circle',
     *  "radius-meters": 500,   // FIXME: radius in meters used for in-circle click detection.
     *  "source": {
     *    "type": 'geojson',
     *    "data": {
     *      "type": "Feature",
     *      "geometry": {
     *        "type": "Point",
     *        "coordinates": [ lng, lat ]
     *      }
     *    }
     *  },
     *  "paint": {
     *    "circle-radius": {
     *      "stops": [
     *        [0, 0],
     *        [20, 8000 ]
     *      ],
     *      "base": 2
     *    },
     *    'circle-opacity': 0.05,
     *    'circle-color': '#ed6498',
     *    'circle-stroke-width': 2,
     *    'circle-stroke-color': '#ed6498'
     *  }
     *
     * 'source' may also refer to a vector source
     *
     * 'source': {
     *    'type': 'vector',
     *    'url': '<url of vector source>'
     *  }
     *
     * or it may be a string referring to the id of an already added source as in
     *
     * 'source': '<id of source>'
     *
     * @param {object} style a Mapbox style describing the circle draw.
     * @param {object} nativeMap view.
     */

    private addCircleLayer(style, nativeMapViewInstance?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (style.type !== 'circle') {
                    reject('Non circle style passed to addCircle()');
                }

                // the source may be of type geojson or it may be the id of a source added by addSource().

                let sourceId = null;

                if (typeof style.source != 'string') {
                    sourceId = style.id + '_source';

                    this.addSource(sourceId, style.source);
                } else {
                    sourceId = style.source;
                }

                const circle = new com.mapbox.mapboxsdk.style.layers.CircleLayer(style.id, sourceId);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleLayer(): after CircleLayer');
                }

                // This took ages to figure out.
                //
                // Interpolate takes as arguments a function the calculates the interpolation,
                // a function that returns a set of values,
                // and a variable number of stop arguments (or possibly others).
                //
                // It was not clear how to specify the variable number of arguments. Listing them out in a comma
                // separated fashion would result in:
                //
                //  Error in mapbox.addCircle: Error: java.lang.Exception: Failed resolving method interpolate on class com.mapbox.mapboxsdk.style.expressions.Expression
                //
                // It looks like you just pass the variable arguments as a simple array. It seems to work but I have not been able
                // to find any documentation to support this. I figured this out over hours of trial and error.
                //
                // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-interpolate

                let circleProperties = [];

                // some defaults if there's no paint property to the style

                if (typeof style.paint == 'undefined') {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Mapbox:addCircle(): paint is undefined');
                    }

                    circleProperties = [
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleColor('red'),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(
                            com.mapbox.mapboxsdk.style.expressions.Expression.interpolate(
                                com.mapbox.mapboxsdk.style.expressions.Expression.exponential(new java.lang.Float(2.0)),
                                com.mapbox.mapboxsdk.style.expressions.Expression.zoom(),
                                [
                                    com.mapbox.mapboxsdk.style.expressions.Expression.stop(new java.lang.Float(0), new java.lang.Float(0)),
                                    com.mapbox.mapboxsdk.style.expressions.Expression.stop(new java.lang.Float(20), new java.lang.Float(6000)),
                                ]
                            )
                        ),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleBlur(new java.lang.Float(0.2)),
                    ];
                } else {
                    // color

                    if (style.paint['circle-color']) {
                        circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleColor(style.paint['circle-color']));
                    }

                    // opacity

                    if (style.paint['circle-opacity']) {
                        circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleOpacity(new java.lang.Float(style.paint['circle-opacity'])));
                    }

                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Mapbox:addCircle(): after opactiy');
                    }

                    // stroke width

                    if (style.paint['circle-stroke-width']) {
                        circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleStrokeWidth(new java.lang.Float(style.paint['circle-stroke-width'])));
                    }

                    // stroke color

                    if (style.paint['circle-stroke-color']) {
                        circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleStrokeColor(style.paint['circle-stroke-color']));
                    }

                    if (!style.paint['circle-radius']) {
                        // some default so something will show up on the map.

                        circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(new java.lang.Float(30)));
                    } else {
                        // we have two options for a radius. We might have a fixed float or an expression

                        if (typeof style.paint['circle-radius'] == 'number') {
                            circleProperties.push(com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(new java.lang.Float(style.paint.radius)));
                        } else {
                            if (!style.paint['circle-radius'].stops) {
                                reject('No radius or stops provided to addCircleLayer.');
                            }

                            // for the moment we assume we have a set of stops and a base.

                            const stopArgs = [];

                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, "Mapbox:addCircleLayer(): adding '" + style.paint['circle-radius'].stops.length + "' stops");
                            }

                            for (let i = 0; i < style.paint['circle-radius'].stops.length; i++) {
                                const stop = style.paint['circle-radius'].stops[i];
                                stopArgs.push(com.mapbox.mapboxsdk.style.expressions.Expression.stop(new java.lang.Float(stop[0]), new java.lang.Float(stop[1])));
                            }

                            let base = 2;

                            if (style.paint['circle-radius'].stops.base) {
                                base = style.paint['circle-radius'].stops.base;
                            }

                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, 'Mapbox:addCircleLayer(): pushing circleRadius with base:', base);
                            }

                            circleProperties.push(
                                com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(
                                    com.mapbox.mapboxsdk.style.expressions.Expression.interpolate(
                                        com.mapbox.mapboxsdk.style.expressions.Expression.exponential(new java.lang.Float(base)),
                                        com.mapbox.mapboxsdk.style.expressions.Expression.zoom(),
                                        stopArgs
                                    )
                                )
                            );
                        } // end of else we do not have a numeric circle radius
                    } // end of else we have a circle-radius
                }

                circle.setProperties(circleProperties);

                this._mapboxMapInstance.getStyle().addLayer(circle);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleLayer(): added circle layer');
                }

                // In support for clickable GeoJSON features.

                const circleEntry = this.circles.find((entry) => entry.id === sourceId);

                if (circleEntry) {
                    circleEntry.radius = style['circle-radius'];
                    circleEntry.layer = circle;
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleLayer(): after addLayer');
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addCircleLayer: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of addCircleLayer()

    // ----------------------------------------

    addGeoJsonClustered(options: AddGeoJsonClusteredOptions, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this._mapboxMapInstance.getStyle().addSource(
                    new com.mapbox.mapboxsdk.style.sources.GeoJsonSource(
                        options.name,
                        new java.net.URL(options.data),
                        new com.mapbox.mapboxsdk.style.sources.GeoJsonOptions()
                            .withCluster(true)
                            .withClusterMaxZoom(options.clusterMaxZoom || 13)
                            .withClusterRadius(options.clusterRadius || 40)
                    )
                );

                const layers = [];
                if (options.clusters) {
                    for (let i = 0; i < options.clusters.length; i++) {
                        // TODO also allow Color object
                        layers.push([options.clusters[i].points, new Color(options.clusters[i].color).android]);
                    }
                } else {
                    layers.push([150, new Color('red').android]);
                    layers.push([20, new Color('green').android]);
                    layers.push([0, new Color('blue').android]);
                }

                const unclustered = new com.mapbox.mapboxsdk.style.layers.SymbolLayer('unclustered-points', options.name);
                unclustered.setProperties([
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleColor(new Color('red').android),
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(new java.lang.Float(16.0)),
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleBlur(new java.lang.Float(0.2)),
                ]);
                console.log(com.mapbox.mapboxsdk.style.expressions.Expression.get('cluster'));
                unclustered.setFilter(com.mapbox.mapboxsdk.style.expressions.Expression.neq(com.mapbox.mapboxsdk.style.expressions.Expression.get('cluster'), true));
                this._mapboxMapInstance.getStyle().addLayer(unclustered); // , "building");

                for (let i = 0; i < layers.length; i++) {
                    // Add some nice circles
                    const circles = new com.mapbox.mapboxsdk.style.layers.CircleLayer('cluster-' + i, options.name);
                    circles.setProperties([
                        // com.mapbox.mapboxsdk.style.layers.PropertyFactory.iconImage("icon")
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleColor(layers[i][1]),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleRadius(new java.lang.Float(22.0)),
                        com.mapbox.mapboxsdk.style.layers.PropertyFactory.circleBlur(new java.lang.Float(0.2)),
                    ]);

                    const pointCount = com.mapbox.mapboxsdk.style.expressions.Expression.toNumber(com.mapbox.mapboxsdk.style.expressions.Expression.get('point_count'));
                    if (i === 0) {
                        circles.setFilter(
                            com.mapbox.mapboxsdk.style.expressions.Expression.gte(pointCount, com.mapbox.mapboxsdk.style.expressions.Expression.literal(java.lang.Integer.valueOf(layers[i][0])))
                        );
                    } else {
                        circles.setFilter(
                            com.mapbox.mapboxsdk.style.expressions.Expression.all([
                                com.mapbox.mapboxsdk.style.expressions.Expression.gte(pointCount, com.mapbox.mapboxsdk.style.expressions.Expression.literal(java.lang.Integer.valueOf(layers[i][0]))),
                                com.mapbox.mapboxsdk.style.expressions.Expression.lt(
                                    pointCount,
                                    com.mapbox.mapboxsdk.style.expressions.Expression.literal(java.lang.Integer.valueOf(layers[i - 1][0]))
                                ),
                            ])
                        );
                    }

                    this._mapboxMapInstance.getStyle().addLayer(circles); // , "building");
                }

                // Add the count labels (note that this doesn't show.. #sad)
                const count = new com.mapbox.mapboxsdk.style.layers.SymbolLayer('count', options.name);
                count.setProperties([
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.textField(com.mapbox.mapboxsdk.style.expressions.Expression.get('point_count')),
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.textSize(new java.lang.Float(12.0)),
                    com.mapbox.mapboxsdk.style.layers.PropertyFactory.textColor(new Color('white').android),
                ]);
                this._mapboxMapInstance.getStyle().addLayer(count);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addGeoJsonClustered: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------------------------------

    /**
     * constantly center the map on the users location.
     */

    trackUser(options: TrackUserOptions, nativeMap?): Promise<void> {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'trackUser(): top');
        }

        return new Promise((resolve, reject) => {
            try {
                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                this.requestFineLocationPermission()
                    .then(() => {
                        this.showUserLocationMarker({
                            useDefaultLocationEngine: true,
                        });
                    })
                    .catch((err) => {
                        console.error('Location permission denied. error:', err);
                    });

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.trackUser: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // --------------------------------------------------------------------------------

    private static getAndroidColor(color: string | Color): any {
        let androidColor;

        if (color && Color.isValid(color)) {
            androidColor = new Color('' + color).android;
        } else {
            androidColor = new Color('#000').android;
        }

        return androidColor;
    }

    // --------------------------------------------------------------------------------

    _getMapStyle(input: any): any {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, '_getMapStyle(): top with input:', input);
        }

        // This changed in Mapbox GL Android 7.0.0

        const Style = com.mapbox.mapboxsdk.maps.Style;

        // allow for a style URL to be passed

        if (input.startsWith('mapbox://styles') || input.startsWith('http://') || input.startsWith('https://')) {
            return input;
        } else if (input.startsWith('~/')) {
            return 'file://' + path.join(knownFolders.currentApp().path, input.replace('~/', ''));
        } else if (input === MapStyle.LIGHT) {
            return Style.LIGHT;
        } else if (input === MapStyle.DARK) {
            return Style.DARK;
        } else if (input === MapStyle.OUTDOORS) {
            return Style.OUTDOORS;
        } else if (input === MapStyle.SATELLITE) {
            return Style.SATELLITE;
        } else if (input === MapStyle.SATELLITE_STREETS) {
            return Style.SATELLITE_STREETS;
        } else if (input === MapStyle.TRAFFIC_DAY) {
            return Style.TRAFFIC_DAY;
        } else if (input === MapStyle.TRAFFIC_NIGHT) {
            return Style.TRAFFIC_NIGHT;
        } else {
            // default
            return Style.MAPBOX_STREETS;
        }
    } // end of _getMapStyle()

    // --------------------------------------------------------------------------------

    /**
     * Mapbox Map Options
     *
     * @link https://github.com/mapbox/mapbox-gl-native/wiki/Android-6.x-to-7.x-migration-guide
     * @link https://github.com/mapbox/mapbox-gl-native/blob/master/platform/android/MapboxGLAndroidSDK/src/main/java/com/mapbox/mapboxsdk/maps/MapboxMapOptions.java
     * @link https://docs.mapbox.com/android/api/map-sdk/7.1.2/com/mapbox/mapboxsdk/maps/MapboxMapOptions.html
     */

    _getMapboxMapOptions(settings) {
        const mapboxMapOptions = new com.mapbox.mapboxsdk.maps.MapboxMapOptions()
            .compassEnabled(!settings.hideCompass)
            .rotateGesturesEnabled(!settings.disableRotation)
            .scrollGesturesEnabled(!settings.disableScroll)
            .tiltGesturesEnabled(!settings.disableTilt)
            .zoomGesturesEnabled(!settings.disableZoom)
            .attributionEnabled(!settings.hideAttribution)
            .logoEnabled(!settings.hideLogo);

        // zoomlevel is not applied unless center is set
        if (settings.zoomLevel && !settings.center) {
            // Eiffel tower, Paris
            settings.center = {
                lat: 48.858093,
                lng: 2.294694,
            };
        }

        if (settings.center && settings.center.lat && settings.center.lng) {
            const cameraPositionBuilder = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder()
                .zoom(settings.zoomLevel)
                .target(new com.mapbox.mapboxsdk.geometry.LatLng(settings.center.lat, settings.center.lng));
            mapboxMapOptions.camera(cameraPositionBuilder.build());
        }

        return mapboxMapOptions;
    } // end of _getMapboxMapOptions()

    // -----------------------------------------------------------------

    /**
     * convert string to camera mode constant.
     *
     * @link https://docs.mapbox.com/android/api/map-sdk/8.1.0/com/mapbox/mapboxsdk/location/modes/CameraMode.html
     */

    _stringToCameraMode(mode: UserLocationCameraMode): any {
        const modeRef = com.mapbox.mapboxsdk.location.modes.CameraMode;

        switch (mode) {
            case 'NONE':
                return modeRef.NONE;

            case 'NONE_COMPASS':
                return modeRef.NONE_COMPASS;

            case 'NONE_GPS':
                return modeRef.NONE_GPS;

            case 'TRACKING':
                return modeRef.TRACKING;

            case 'TRACK_COMPASS':
                return modeRef.TRACKING_COMPASS;

            case 'TRACKING_GPS':
                return modeRef.TRACKING_GPS;

            case 'TRACK_GPS_NORTH':
                return modeRef.TRACKING_GPS_NORTH;
        }
    }

    // ---------------------------------------------------------------

    /**
     * convert string to render mode
     */

    _stringToRenderMode(mode): any {
        let renderMode: any;

        switch (mode) {
            case 'NORMAL':
                renderMode = com.mapbox.mapboxsdk.location.modes.RenderMode.NORMAL;
                break;

            case 'COMPASS':
                renderMode = com.mapbox.mapboxsdk.location.modes.RenderMode.COMPASS;
                break;

            case 'GPS':
                renderMode = com.mapbox.mapboxsdk.location.modes.RenderMode.GPS;
                break;
        }

        return renderMode;
    }

    // ---------------------------------------------------------------

    _fineLocationPermissionGranted() {
        let hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)

        if (!hasPermission) {
            hasPermission = com.mapbox.android.core.permissions.PermissionsManager.areLocationPermissionsGranted(Application.android.context);
        }

        return hasPermission;
    }

    // -------------------------------------------------------------

    _getRegionName(offlineRegion: com.mapbox.mapboxsdk.offline.OfflineRegion) {
        const metadata = offlineRegion.getMetadata();
        const jsonStr = new java.lang.String(metadata, 'UTF-8');
        const jsonObj = new org.json.JSONObject((jsonStr as any) as string);
        return jsonObj.getString('name');
    }

    // --------------------------------------------------------------

    /**
     * show a user location marker
     *
     * This method must not be called before location permissions have been granted.
     *
     * Supported options are:
     *
     * - elevation
     * - accuracyColor
     * - accuracyAlpha
     * - useDefaultLocationEngine
     * - renderMode
     * - cameraMode
     * - clickListener
     * - cameraTrackingChangeListener
     *
     * @param {object} options
     *
     * @link https://github.com/mapbox/mapbox-android-demo/blob/master/MapboxAndroidDemo/src/main/java/com/mapbox/mapboxandroiddemo/examples/location/LocationComponentOptionsActivity.java
     * @link https://developer.android.com/reference/android/graphics/Color
     *
     * @todo at least with simulated data, the location is only updated once hence adding support for forceLocation method.
     */

    showUserLocationMarker(options: any, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'showUserLocationMarker()');
                }

                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                if (!com.mapbox.android.core.permissions.PermissionsManager.areLocationPermissionsGranted(Application.android.context)) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'showUserLocationMarker(): location permissions are not granted.');
                    }

                    reject('Location permissions not granted.');
                    return;
                }

                const componentOptionsBuilder = com.mapbox.mapboxsdk.location.LocationComponentOptions.builder(Application.android.context);

                if (typeof options.elevation != 'undefined') {
                    componentOptionsBuilder.elevation(options.elevation);
                }

                if (typeof options.accuracyColor != 'undefined') {
                    componentOptionsBuilder.accuracyColor(android.graphics.Color.parseColor(options.accuracyColor));
                }

                if (typeof options.accuracyAlpha != 'undefined') {
                    componentOptionsBuilder.accuracyAlpha(options.accuracyAlpha);
                }

                const componentOptions = componentOptionsBuilder.build();


                this._locationComponent = this._mapboxMapInstance.getLocationComponent();


                const activationOptionsBuilder = com.mapbox.mapboxsdk.location.LocationComponentActivationOptions.builder(Application.android.context, this._mapboxMapInstance.getStyle());


                activationOptionsBuilder.locationComponentOptions(componentOptions);

                let useDefaultEngine = true;

                if (typeof options.useDefaultLocationEngine != 'undefined') {
                    useDefaultEngine = options.useDefaultLocationEngine;
                }
                activationOptionsBuilder.useDefaultLocationEngine(useDefaultEngine);


                const locationComponentActivationOptions = activationOptionsBuilder.build();

                this._locationComponent.activateLocationComponent(locationComponentActivationOptions);
                this._locationComponent.setLocationComponentEnabled(true);

                let cameraMode = this._stringToCameraMode('TRACKING');

                if (typeof options.cameraMode != 'undefined') {
                    cameraMode = this._stringToCameraMode(options.cameraMode);
                }

                this._locationComponent.setCameraMode(cameraMode);

                let renderMode = com.mapbox.mapboxsdk.location.modes.RenderMode.COMPASS;

                if (typeof options.renderMode != 'undefined') {
                    renderMode = this._stringToRenderMode(options.renderMode);
                }

                this._locationComponent.setRenderMode(renderMode);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'showUserLocationMarker(): after renderMode');
                }

                if (typeof options.clickListener != 'undefined') {
                    this.onLocationClickListener = new com.mapbox.mapboxsdk.location.OnLocationClickListener({
                        onLocationComponentClick: () => {
                            options.clickListener();
                        },
                    });

                    this._locationComponent.addOnLocationClickListener(this.onLocationClickListener);

                    // this.gcFix('com.mapbox.mapboxsdk.location.OnLocationClickListener', this.onLocationClickListener);
                }

                if (typeof options.cameraTrackingChangedListener != 'undefined') {
                    this._locationComponent.addOnCameraTrackingChangedListener(options.cameraTrackingChangedListener);
                }

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.showUserLocationMarker: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of showUserLocationMarker()

    // ---------------------------------------------------------------

    /**
     * hide (destroy) the user location marker
     *
     * This method destroys the user location marker.
     */

    hideUserLocationMarker(nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'hideUserLocationMarker(): top');
                }

                if (!this._mapboxMapInstance) {
                    reject('No map has been loaded');
                    return;
                }

                if (!this._locationComponent) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'hideUserLocationMarker(): no location component is loaded.');
                    }

                    resolve();
                    return;
                }

                this._locationComponent.setLocationComponentEnabled(false);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.hideUserLocationMarker: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------

    /**
     * Change the mode of the user location marker
     *
     * Used to change the camera tracking and render modes of an existing
     * marker.
     *
     * The marker must be configured using showUserLocationMarker before this method
     * can called.
     */

    changeUserLocationMarkerMode(renderModeString, cameraModeString: UserLocationCameraMode, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this._locationComponent) {
                    reject('No location component has been loaded');
                    return;
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'changeUserLocationMarkerMode(): current render mode is:', this._locationComponent.getRenderMode());
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, "Mapbox::changeUserLocationMarkerMode(): changing renderMode to '" + renderModeString + "' cameraMode '" + cameraModeString + "'");
                }

                const cameraMode = this._stringToCameraMode(cameraModeString);
                const renderMode = this._stringToRenderMode(renderModeString);

                this._locationComponent.setCameraMode(cameraMode);
                this._locationComponent.setRenderMode(renderMode);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'changeUserLocationMarkerMode(): new render mode is:', this._locationComponent.getRenderMode());
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.showUserLocationMarker: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------

    /**
     * force updating of user location
     *
     * This method forces the user location marker, if displayed, to move to a new location
     *
     * @todo figure out why the user location marker is not updating.
     */

    forceUserLocationUpdate(location: any, nativeMap?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'forceUserLocation(): top');
                }

                if (!this._locationComponent) {
                    reject('No location component has been loaded');
                    return;
                }

                // the location object needs to be converted into an android location

                const nativeLocation = new android.location.Location('background');

                nativeLocation.setLatitude(location.latitude);
                nativeLocation.setLongitude(location.longitude);
                nativeLocation.setAltitude(location.altitude);

                this._locationComponent.forceLocationUpdate(nativeLocation);

                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.forceUserLocationUpdate: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------

    getLayer(name: string, nativeMap?: any): Promise<LayerCommon> {
        return new Promise((resolve, reject) => {
            try {
                const theMap = nativeMap || this._mapboxMapInstance;

                if (!theMap) {
                    reject('No map has been loaded');
                    return;
                }

                const styleLoadedCallback = new com.mapbox.mapboxsdk.maps.Style.OnStyleLoaded({
                    onStyleLoaded: (style) => {
                        const layer = style.getLayer(name);
                        console.log('layer :', layer);
                        resolve(layer ? new Layer(layer) : null);
                    },
                });

                theMap.getStyle(styleLoadedCallback);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getLayer: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ----------------------------------------------------------------------------------

    getLayers(nativeMap?: any): Promise<Array<LayerCommon>> {
        return new Promise((resolve, reject) => {
            try {
                const theMap = nativeMap || this._mapboxMapInstance;

                if (!theMap) {
                    reject('No map has been loaded');
                    return;
                }

                const styleLoadedCallback = new com.mapbox.mapboxsdk.maps.Style.OnStyleLoaded({
                    onStyleLoaded: (style) => {
                        const layers = style.getLayers();
                        const result: Layer[] = [];

                        for (let i = 0; i < layers.size(); i++) {
                            result.push(new Layer(layers.get(i)));
                        }

                        resolve(result);
                    },
                });

                theMap.getStyle(styleLoadedCallback);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.getLayers: ' + ex);
                }
                reject(ex);
            }
        });
    }

    // ---------------------------------------------------------------

    _getClickedMarkerDetails(clicked) {
        for (const m in this._markers) {
            const cached = this._markers[m];
            if (
                // eslint-disable-next-line eqeqeq
                cached.lat == clicked.getPosition().getLatitude() &&
                // eslint-disable-next-line eqeqeq
                cached.lng == clicked.getPosition().getLongitude() &&
                // eslint-disable-next-line eqeqeq
                cached.title == clicked.getTitle() && // == because of null vs undefined
                // eslint-disable-next-line eqeqeq
                cached.subtitle == clicked.getSnippet()
            ) {
                return cached;
            }
        }
    }

    // ------------------------------------------------------------

    _downloadImage(marker) {
        return new Promise((resolve, reject) => {
            // to cache..
            if (this._markerIconDownloadCache[marker.icon]) {
                marker.iconDownloaded = this._markerIconDownloadCache[marker.icon];
                resolve(marker);
                return;
            }
            // ..or not to cache
            getImage(marker.icon).then(
                (output) => {
                    marker.iconDownloaded = output.android;
                    this._markerIconDownloadCache[marker.icon] = marker.iconDownloaded;
                    resolve(marker);
                },
                (e) => {
                    console.log(`Download failed for ' ${marker.icon}' with error: ${e}`);
                    resolve(marker);
                }
            );
        });
    }

    // ------------------------------------------------------------

    _downloadMarkerImages(markers) {
        const iterations = [];
        const result = [];
        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            if (marker.icon && marker.icon.startsWith('http')) {
                const p = this._downloadImage(marker).then((mark) => {
                    result.push(mark);
                });
                iterations.push(p);
            } else {
                result.push(marker);
            }
        }
        return Promise.all(iterations).then((output) => result);
    }

    // -------------------------------------------------------------------------------------
    // Current Unused. Left here for reference.
    // -------------------------------------------------------------------------------------

    /**
     * add a circle Annotation
     *
     * Draw a circle Annotation based on a GeoJSON feature..
     *
     * This method is not used but is left here for reference. At the present moment
     * these circles cannot be scaled according to zoom level (or other property).
     *
     * @param {object} geojson .
     * @param {object} nativeMap view.
     */

    private addCircleAnnotation(geojson, nativeMapViewInstance?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleAnnotation(): top with geojson:', geojson);
                }

                // we need a source of type geojson.

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleAnnotation(): before addSource with geojson:', geojson);
                }

                const geojsonString = JSON.stringify(geojson);

                const layer = this.circleManager.create(geojsonString);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addCircleAnnotation(): added circle annotation:', layer);
                }

                resolve(layer);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addCircleAnnotation: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of addCircleAnnotation()

    // -------------------------------------------------------------------------------------

    /**
     * add a line annotation
     *
     * Draws a line using the new Annotations plugin.
     *
     * NOTE: This is here just for reference.
     *
     * The Annotations plugin allows for listening to events on a line which the standard Layer
     * classes do not.
     *
     * However, what sucks is that:
     *
     * - Annotations do not provide the range of styling options that a line layer does
     * - Annotations use a GeoJSON format, where styling is done via a properties child, instead of the Mapbox Style format.
     *
     * {
     *   "type": "FeatureCollection",
     *   "features": [{
     *     "type": "Feature",
     *     "geometry": {
     *       "type": "LineString",
     *       "coordinates": [
     *         [ -76.947041, 39.007846 ],
     *         [ 12.5, 41.9 ]
     *       ]
     *     },
     *     "properties": {
     *       "line-color": "white",
     *       "line-width": "8",
     *       "is-draggable": false
     *     }
     *   }]
     * }
     *
     * @param {object} geojson - a GeoJSON feature collection.
     * @param {any} nativeMapView - native map view (com.mapbox.mapboxsdk.maps.MapView)
     *
     * @return {Promise<void>}
     *
     * @link https://docs.mapbox.com/android/api/plugins/annotation/0.5.0/com/mapbox/mapboxsdk/plugins/annotation/package-summary.html
     * @link https://docs.mapbox.com/android/api/map-sdk/7.1.2/com/mapbox/mapboxsdk/maps/Style.html#addSource-com.mapbox.mapboxsdk.style.sources.Source-
     */

    private addLineAnnotation(geojson, nativeMapViewInstance?): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineAnnotation(): before addSource with geojson:', geojson);
                }

                const geojsonString = JSON.stringify(geojson);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineAnnotation(): before create');
                }

                const line = this.lineManager.create(geojsonString);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Mapbox:addLineAnnotation(): added line annotation:', line);
                }

                resolve(line);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, 'Error in mapbox.addPolyline: ' + ex);
                }
                reject(ex);
            }
        });
    } // end of addLineAnnotation

    // -------------------------------------------------------------------------------------

    private async testLineAnnotation(nativeMapView) {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: this.getTestCoords(),
                    },
                    properties: {
                        'line-color': 'white',
                        'line-width': '8',
                        'line-dash-array': [2, 4, 2, 1],
                    },
                },
            ],
        };

        const dashArray = Array.create('java.lang.Float', geojson.features[0].properties['line-dash-array'].length);

        for (let i = 0; i < geojson.features[0].properties['line-dash-array'].length; i++) {
            dashArray[i] = new java.lang.Float(geojson.features[0].properties['line-dash-array'][i]);
        }

        const line = await this.addLineAnnotation(geojson, nativeMapView);

        this.lineManager.setLineDashArray(dashArray);
    }

    // -----------------------------------------------------------------------------------------

    getTestCoords() {
        return [
            [-76.926164, 39.019062],
            [-76.9261, 39.019168],
            [-76.926013, 39.019257],
            [-76.925905, 39.019328],
            [-76.925777, 39.01938],
            [-76.925632, 39.019408],
            [-76.925481, 39.019405],
            [-76.925337, 39.019372],
            [-76.925209, 39.019313],
            [-76.925104, 39.019234],
            [-76.925026, 39.019136],
            [-76.92501, 39.018851],
            [-76.925054, 39.018724],
            [-76.925139, 39.018616],
            [-76.925252, 39.018528],
            [-76.925387, 39.018465],
            [-76.925539, 39.018433],
            [-76.925694, 39.018422],
            [-76.925857, 39.018426],
            [-76.926027, 39.018437],
            [-76.927847, 39.018652],
            [-76.930178, 39.019155],
            [-76.932151, 39.019811],
            [-76.934475, 39.02073],
            [-76.938543, 39.022225],
            [-76.941642, 39.022854],
            [-76.944704, 39.023275],
            [-76.94638, 39.024124],
            [-76.948033, 39.02576],
            [-76.948497, 39.027019],
            [-76.948306, 39.028576],
            [-76.947345, 39.03015],
            [-76.945672, 39.031692],
            [-76.943317, 39.033067],
            [-76.941067, 39.034591],
            [-76.938712, 39.036849],
            [-76.937134, 39.039019],
            [-76.934067, 39.043621],
            [-76.931722, 39.047206],
            [-76.929912, 39.050756],
            [-76.928589, 39.053624],
            [-76.927063, 39.056683],
            [-76.925731, 39.058167],
            [-76.924575, 39.059077],
            [-76.922749, 39.06007],
            [-76.920061, 39.061071],
            [-76.918383, 39.061644],
            [-76.915324, 39.062765],
            [-76.913071, 39.0638],
            [-76.910303, 39.065627],
            [-76.908491, 39.067117],
            [-76.907337, 39.068725],
            [-76.90608, 39.071488],
            [-76.905077, 39.073318],
            [-76.904587, 39.074003],
            [-76.9044, 39.074114],
            [-76.904184, 39.074189],
            [-76.903946, 39.074212],
            [-76.903712, 39.074192],
            [-76.903464, 39.074145],
            [-76.903301, 39.07403],
            [-76.903158, 39.073875],
            [-76.903071, 39.073696],
            [-76.903039, 39.073516],
            [-76.903065, 39.073338],
            [-76.903149, 39.073168],
            [-76.903282, 39.073021],
            [-76.903465, 39.072896],
            [-76.903679, 39.072819],
            [-76.903903, 39.072786],
            [-76.904124, 39.072797],
            [-76.904329, 39.072851],
            [-76.904518, 39.07294],
            [-76.904706, 39.073029],
            [-76.904855, 39.073158],
            [-76.906221, 39.074084],
            [-76.908129, 39.074828],
            [-76.910401, 39.075078],
            [-76.913482, 39.074758],
            [-76.924829, 39.073772],
            [-76.930687, 39.073591],
            [-76.936115, 39.073664],
            [-76.945228, 39.074826],
            [-76.948338, 39.075918],
            [-76.954834, 39.079209],
            [-76.958566, 39.081175],
            [-76.962182, 39.082907],
            [-76.964617, 39.083332],
            [-76.967407, 39.083191],
            [-76.969484, 39.083412],
            [-76.971742, 39.08417],
            [-76.976687, 39.086114],
            [-76.983025, 39.088788],
            [-76.985704, 39.089512],
            [-76.988488, 39.089779],
            [-76.991281, 39.08959],
            [-76.997539, 39.088687],
            [-77.001787, 39.088312],
            [-77.008541, 39.087897],
            [-77.013845, 39.087128],
            [-77.020459, 39.085992],
            [-77.023236, 39.085835],
            [-77.025211, 39.086389],
            [-77.02675, 39.087508],
            [-77.02771, 39.089008],
            [-77.028146, 39.090903],
            [-77.029034, 39.093259],
            [-77.030437, 39.094859],
            [-77.032618, 39.096362],
            [-77.035143, 39.097464],
            [-77.038513, 39.098369],
            [-77.04213, 39.099532],
            [-77.044851, 39.100887],
            [-77.047813, 39.102913],
            [-77.050996, 39.105187],
            [-77.055267, 39.108274],
            [-77.058337, 39.110646],
            [-77.061623, 39.113689],
            [-77.064504, 39.115979],
            [-77.066908, 39.117065],
            [-77.069589, 39.117678],
            [-77.08194, 39.120455],
            [-77.087705, 39.123085],
            [-77.091849, 39.124533],
            [-77.096482, 39.12562],
            [-77.10105, 39.12621],
            [-77.106463, 39.126419],
            [-77.113894, 39.126642],
            [-77.118437, 39.12699],
            [-77.120607, 39.127777],
            [-77.122318, 39.129042],
            [-77.124218, 39.131225],
            [-77.126393, 39.133643],
            [-77.128644, 39.135491],
            [-77.131388, 39.136958],
            [-77.138116, 39.139101],
            [-77.140084, 39.138936],
            [-77.141828, 39.138163],
            [-77.143102, 39.136928],
            [-77.144688, 39.135612],
            [-77.146269, 39.135118],
            [-77.147972, 39.13511],
            [-77.149904, 39.135622],
            [-77.155834, 39.13733],
            [-77.158453, 39.137591],
            [-77.161087, 39.137398],
            [-77.163593, 39.136765],
            [-77.166115, 39.135549],
            [-77.167949, 39.13405],
            [-77.171853, 39.129988],
            [-77.175581, 39.12612],
            [-77.179622, 39.122026],
            [-77.180894, 39.121131],
            [-77.18119, 39.121005],
            [-77.181495, 39.120898],
            [-77.181806, 39.120804],
            [-77.182127, 39.120726],
            [-77.182461, 39.120671],
            [-77.182803, 39.120637],
            [-77.183148, 39.120626],
            [-77.183494, 39.120636],
            [-77.183839, 39.120665],
            [-77.184182, 39.120715],
            [-77.18452, 39.120787],
            [-77.184852, 39.120878],
            [-77.185494, 39.121106],
            [-77.189478, 39.12277],
            [-77.191456, 39.123177],
            [-77.194133, 39.123137],
            [-77.197993, 39.123036],
            [-77.198559, 39.123151],
            [-77.198828, 39.123246],
            [-77.199081, 39.123364],
            [-77.199314, 39.123501],
            [-77.199519, 39.123656],
            [-77.199701, 39.123827],
            [-77.199863, 39.124012],
            [-77.200012, 39.124209],
            [-77.201714, 39.126527],
            [-77.203814, 39.128927],
            [-77.206368, 39.131478],
            [-77.208734, 39.134112],
            [-77.210918, 39.137302],
            [-77.21266, 39.14068],
            [-77.214526, 39.145223],
            [-77.21551, 39.146948],
            [-77.217811, 39.149987],
            [-77.220639, 39.152707],
            [-77.224698, 39.155944],
            [-77.228768, 39.158858],
            [-77.233073, 39.161274],
            [-77.237891, 39.163827],
            [-77.240401, 39.165853],
            [-77.242376, 39.168174],
        ];
    }
} // end of class Mapbox

export class Layer implements LayerCommon {
    public id: string;
    private instance: any;

    constructor(instance: any) {
        this.instance = instance;
        this.id = instance.getId();
    }

    public visibility(): boolean {
        return this.instance.getVisibility().getValue() === 'visible' ? true : false;
    }

    public show(): void {
        this.instance.setProperties([new com.mapbox.mapboxsdk.style.layers.PropertyValue('visibility', 'visible')]);
    }

    public hide(): void {
        this.instance.setProperties([new com.mapbox.mapboxsdk.style.layers.PropertyValue('visibility', 'none')]);
    }
}

// END
