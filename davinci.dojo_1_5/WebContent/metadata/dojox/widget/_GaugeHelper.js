dojo.provide("davinci.libraries.dojo.dojox.widget._GaugeHelper");

dojo.declare("davinci.libraries.dojo.dojox.widget._GaugeHelper", null, {

	// _widget: String
	// 		Class name of the _Gauge ("AnalogGauge", "BarGauge").
	_widget: null,

	// _oldPostCreate: Function
	//		postCreate function that this helper replaces (to stop the tooltip from showing).
	//		Invoked in the correct context after the tooltip is disabled.
	_oldPostCreate: null,

	_postCreate: function(){
		// summary:
		// 		stop _Gauge from displaying the master tooltip in its postCreate (causes errors)
		//

		// this=AnalogGauge
		var oldUseTooltip=this.useTooltip;
		this.useTooltip=false;
		// delete copied private data
		if(this.majorTicks){ delete this.majorTicks._ticks; }
		if(this.minorTicks){ delete this.minorTicks._ticks; }
		dojo.hitch(this,dojo.metadata.dojox.widget._GaugeHelper._oldPostCreate)();
		this.useTooltip=oldUseTooltip;
	},

	getData: function(/*Widget*/ widget, /*JSON*/ options){
		// summary:
		//		Same as default getData routine with cleanup.
		//		ModifyCommand works by recreating the _Gauge with the same data.
		//		But _Gauge is not meant to operate in this way because it stores some private data.
		//		Deleting the private data from the passed copy fixes it.
		//
		var data = widget._getData(options);
		delete data.properties.majorTicks._ticks;
		delete data.properties.minorTicks._ticks;
		return data;
	},

	getChildrenData: function(/*Widget*/ widget, /*JSON*/ options){
		// summary:
		//		Construct child widgets from the indicators and ranges so that they show up in the Source view inside the Gauge.
		//

		if(!this._oldPostCreate){
			// AnalogGauge contains an ugly hack to flash the tooltip on postCreate
			var proto=dijit.byId('editorContentPane').domNode.firstChild.contentWindow.dojox.widget[this._widget].prototype;
			this._oldPostCreate=proto.postCreate;
			proto.postCreate=this._postCreate;
		}
		// indicators, ranges are represented as children in markup
		var ranges = dojo.map(this.getPropertyValue(widget,"ranges"), function(r){
			var range={type: "dojox.widget.gauge.Range", properties: r};
			if(options.serialize){
				// TODO: make sure colors aren't converted into {0:{}, 1:{}, ...
				r.color=dojo.toJson(r.color);
			}
			return range;
		});
		var k = 0;
		var indicators = dojo.map(this.getPropertyValue(widget,"indicators"), function(i){
			// fetch declaredClass from widget's indicator widgets
			var indicator = {type: widget.indicators[k].declaredClass||widget._defaultIndicator.prototype.declaredClass, properties: i};
			k++;
			return indicator;
		});
		return indicators.concat(ranges);
	},

	getPropertyValue: function(/*Widget*/ widget, /*String*/ name){
		// summary:
		//		Filter Gauge-specific values so that the returned property does not contain unexpected private data or circular references.
		//

		var value = davinci.ve.widget._getPropertyValue(widget, name);

		if(name == "majorTicks" || name == "minorTicks"){
			// tick marks are easy; just delete _ticks
			var newvalue = {};
			dojo.mixin(newvalue, value);
			// prevent "Can't serialize DOM nodes" error about circular references in dojo.toJSON
			delete newvalue._ticks;
			return newvalue;

		}else if(name=="ranges"){
			// Ranges have a ton of widget-related data that gets autogenerated.
			// Use the metadata as a guide to determine what to copy.
			var newranges = dojo.map(value, function(r){
				var newr = {};
				// prevent "Can't serialize DOM nodes" error about circular references in dojo.toJSON
				// show only properties of interest
				// assumption: only one Range class
				var metadata = davinci.ve.metadata.getMetadata("dojox.widget.gauge.Range").properties;
				for(var p in metadata){
					if(p != "id" && typeof r[p] != "undefined" && r[p]!==""){
						newr[p]=r[p];
					}
				}
				return newr;
			});
			return newranges;
		}else if(name=="indicators"){
			// Indicators also have a ton of widget-related data that gets autogenerated.
			// Use the metadata as a guide to determine what to copy.

			// k needed to get indicator's declaredClass to do the appropriate metadata lookup
			var k = 0;
			var newindicators = dojo.map(value, function(i){
				var newi = {declaredClass: widget.indicators[k].declaredClass||widget._defaultIndicator.prototype.declaredClass};
				// fetch declaredClass from widget's indicator widgets
				var metadata = davinci.ve.metadata.getMetadata(newi.declaredClass).properties;
				for(var p in metadata){
					if(p != "id"){
						newi[p]=i[p];
					}
				}
				k++;
				return newi;
			});
			return newindicators;
		}
		return value;
	}
});