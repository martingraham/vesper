VESPER.DWCAParser = new function () {

    //this.TDATA = "tdata";
    //this.TAXA = "taxa";
    //this.EXT = "ext";

    this.TDATA = 0;
    this.TAXA = 1;
    this.EXT = 2;
    this.SYN = 3;
    this.SPECS = "s";

    this.SUPERROOT = "superroot";


	// terms from old darwin core archive format superseded by newer ones
    // http://rs.tdwg.org/dwc/terms/history/index.htm
	var altTerms = {"class":"classs",   // done to avoid clashing with reserved class keyword in java. I don't think there is one in javascript though.
			"DarwinCore":"Occurrence",
			"SimpleDarwinCore":"Occurrence",
			"catalogNumberNumeric":"catalogNumber",
			"collectorNumber":"recordNumber",
			"collector":"recordedBy",
			"nativeness":"establishmentMeans",
			"latestDateCollected":"eventDate",
			"earliestDateCollected":"eventDate",
			"state":"stateProvince",
			"province":"stateProvince",
			"city":"municipality",
			"depth":"verbatimDepth",
			"elevation":"verbatimElevation",
			"latitude":"decimalLatitude",
			"longitude":"decimalLongitude",
			"datum":"geodeticDatum",
			"nameUsageID":"taxonID",
			"nameID":"scientificNameID",
			"acceptedTaxonID":"acceptedNameUsageID",
			"parentTaxonID":"parentNameUsageID",
			"higherTaxonID":"parentNameUsageID",
			"higherNameUsageID":"parentNameUsageID",
			"originalNameID":"originalNameUsageID",
			"originalTaxonID":"originalNameUsageID",
			"basionymID":"originalNameUsageID",
			"taxonAccordingToID":"nameAccordingToID",
			"acceptedTaxon":"acceptedNameUsage",
			"parentTaxon":"parentNameUsage",
			"higherTaxon":"parentNameUsage",
			"higherNameUsage":"parentNameUsage",
			"originalName":"originalNameUsage",
			"originalTaxon":"originalNameUsage",
			"basionym":"originalNameUsage",
			"taxonAccordingTo":"nameAccordingTo",
			"rank":"taxonRank",
            "scientificNameRank":"taxonRank",
			"taxonRemark":"taxonRemarks",
            "EventAttributeType":"measurementType",
            "eventMeasurementType":"measurementType",
            "SamplingAttributeType":"measurementType"
	};


    // terms which tend to be textual descriptions and as such aren't that amenable to the visualisations we
    // wish to do but do gobble up a lot of memory.
    this.flabbyLists = {};
    this.flabbyLists.wordyList = ["eventRemarks", "taxonRemarks", "georeferenceRemarks", "identificationRemarks"
                        ,"locationRemarks", "measurementRemarks", "occurrenceRemarks", "relationshipRemarks"
                        ,"verbatimCoordinates", "bibliographicCitation", "description"
    ];

    // list of terms that are necessary to do the basics of particular visualisations.
    // e.g. we need latitude and longitude values to do map plots
    // It's a given that we need the id for each entry.
    this.explicitRanks = ["kingdom", "phylum", "classs", "order", "family", "genus", "subgenus"];
    this.neccLists = {};
    this.neccLists.geo = ["decimalLatitude", "decimalLongitude", "geodeticDatum"];
    this.neccLists.impTaxonomy = ["acceptedNameUsageID", "parentNameUsageID", "taxonRank"];
    this.neccLists.expTaxonomy = this.explicitRanks.concat(["taxonRank"]);
    this.neccLists.times = ["eventDate", "modified", "geodeticDatum", "georeferencedDate", "dateIdentified", "verbatimEventDate"];
    this.neccLists.basicTimes = ["eventDate"];

    // list of terms that convey a label for a taxon/specimen
    this.labelChoiceData = ["acceptedNameUsage", "scientificName", "originalNameUsage", "vernacularName"];



    // terms for which values are commonly repeated, often from a very small set of possible values.
    // utilising this we can save memory by pointing to a map of values for these fields rather than storing
    // a separate value for each entry.
    // Most are recognised as being suitable for controlled vocabularies by DWCA - http://rs.tdwg.org/dwc/terms/history/index.htm
    this.controlledVocabFields = ["continent", "country", "countryCode", "stateProvince", "county", "island", "islandGroup", "waterBody", "higherGeographyID",
                            "geodeticDatum", "georeferenceVerificationStatus", "verbatimCoordinateSystem", "verbatimSRS",
                            "taxonomicStatus", "language", "nomenclaturalCode", "nomenclaturalStatus", "identificationVerificationStatus",
                            "rightsHolder",
                            "type", "audience", "format",
                            "taxonRank", "verbatimTaxonRank",
                            "basisOfRecord", "dcterms:type", "dcterms:language",
                            "measurementUnit", "behavior",
                            "relationshipOfResource", "establishmentMeans", "occurrenceStatus", "disposition",
                            "sex", "lifeStage", "reproductiveCondition", "isPlural",
                            "threatStatus",
                            "isMarine", "isFreshwater", "isTerrestrial", "isInvasive", "isHybrid", "isExtinct",
                            "typeDesignationType"
    ];
    this.archiveLimitedFields = ["institutionID", "collectionID", "datasetID", "institutionCode", "collectionCode", "datasetName", "ownerInstitutionCode",
                                "year", "month", "day",
                                "source",
                                "nameAccordingToID", "isPreferredName", "typeStatus", "verbatimTaxonRank",
                                "superkingdom", "kingdom", "superphylum", "phylum", "subphylum", "superclass", "classs", "order", "family"
    ];


    this.controlledVocabSet = {};
    for (var i = 0; i < this.controlledVocabFields.length; i++) { this.controlledVocabSet[this.controlledVocabFields[i]] = true; }

    this.discreteTermList = this.controlledVocabFields.concat(this.archiveLimitedFields);
    this.discreteTermSet = {};
    for (var i = 0; i < this.discreteTermList.length; i++) { this.discreteTermSet[this.discreteTermList[i]] = true; }


    // sets of terms for which values can be shared, again opening them up to memory saving through a map.
    // When terms holds the same index in the object below, it indicates a shared value map could be common to those terms.
    // The most common example is parent and taxon ids, all parent name ids must turn up as name ids in another record (unless it's a root)
    // and parent name ids are often repeated anyways. It also works for the base ids which are often just copies of name ids.
    this.sharedValuesTerms = {"taxonID":1, "acceptedNameUsageID":1, "parentNameUsageID":1, "originalNameUsageID":1};


    // Translates URIs into simple labels for interface
    // If no label found will use URI in full
    this.recordURIMap = {
        "http://rs.tdwg.org/dwc/xsd/simpledarwincore/SimpleDarwinRecord": "Simple Darwin Record",
        "http://rs.tdwg.org/dwc/terms/Occurrence" : "Occurrence",
        "http://rs.tdwg.org/dwc/terms/Event" : "Event",
        "http://purl.org/dc/terms/Location" : "Location",
        "http://purl.org/dc/terms/GeologicalContext" : "GeologicalContext",
        "http://rs.tdwg.org/dwc/terms/Identification" : "Identification",
        "http://rs.tdwg.org/dwc/terms/Taxon" : "Taxon",
        "http://rs.tdwg.org/dwc/terms/ResourceRelationship" : "ResourceRelationship",
        "http://rs.tdwg.org/dwc/terms/MeasurementOrFact" : "MeasurementOrFact",
        "http://rs.gbif.org/terms/1.0/Distribution" : "Distribution",
        "http://rs.gbif.org/terms/1.0/VernacularName" : "VernacularName",
        "http://rs.gbif.org/terms/1.0/SpeciesProfile" : "SpeciesProfile",
        "http://rs.gbif.org/terms/1.0/TypesAndSpecimen" : "TypesAndSpecimen",
        "http://rs.gbif.org/terms/1.0/Reference" : "Reference",
        "http://rs.gbif.org/terms/1.0/Image" : "Image",
        "http://rs.gbif.org/terms/1.0/Identifier" : "Identifier",
        "http://rs.gbif.org/terms/1.0/Description" : "Description",
        "http://rs.nordgen.org/dwc/germplasm/0.1/terms/GermplasmSample" : "GermplasmSample",
        "http://purl.org/germplasm/germplasmTerm#GermplasmAccession" : "GermplasmAccession",
        "http://purl.org/germplasm/germplasmTerm#MeasurementExperiment" : "MeasurementExperiment",
        "http://purl.org/germplasm/germplasmTerm#MeasurementMethod" : "MeasurementMethod",
        "http://eol.org/schema/reference/Reference" : "EOL Reference",
        "http://eol.org/schema/media/Document" : "EOL Document",
        "http://eol.org/schema/agent/Agent" : "EOL Agent",
        "http://www.w3.org/ns/oa#Annotationt" : "W3 Annotation"
    };


    this.rowTypeDefaults = {};
    this.fieldAttrNames = {};
    this.xsd = null;

    this.loadxsd = function (xsdFile) {
        VESPER.log ("yp2", xsdFile);
        $.get(xsdFile, function(d){
            // stupid firefox reads in a BOM mark (probably stupid me somewhere else, but I ain't got time)
            //if (d.charCodeAt(0) > 65000 || d.charCodeAt(0) === 255) {
            //    d = d.slice(2);
            //}
           // VESPER.log ("yp22", d.charCodeAt(0), d.charCodeAt(1), d.charCodeAt(2), d);
            //VESPER.log ("Native DOM Parse", NapVisLib.parseXML(d));
           // VESPER.log ($.parseXML(d));
            VESPER.log ("XSD", d, typeof d);
            VESPER.DWCAParser.xsd = (typeof d == "string" ? $(NapVisLib.parseXML(d)) : $(d));
           // VESPER.log ("XSD", DWCAParser.xsd);
            VESPER.DWCAParser.makeRowTypeDefaults (VESPER.DWCAParser.xsd);
            VESPER.DWCAParser.makeFieldAttrNames (VESPER.DWCAParser.xsd);

        });
    };


    this.accessZip = function (text, metaFileName) {
        var zip = new JSZip(text, {base64:false, noInflate:true});
        zip.dwcaFolder = "";
        var newMetaFileName;

        // look for metaFileName in zip entries. May be appended to a folder name.
        for (var n = 0; n < zip.zipEntries.files.length; n++) {
            var fname = zip.zipEntries.files[n].fileName;
            var subStrI = fname.indexOf(metaFileName);
            if (subStrI >= 0) {
                newMetaFileName = fname;
                zip.dwcaFolder = newMetaFileName.slice (0, subStrI);
                break;
            }
        }
        console.log ("ZIP ENTRIES", zip.zipEntries, newMetaFileName);
        zip.zipEntries.readLocalFile (newMetaFileName);
        VESPER.log ("unzipped ", zip, zip.files);
        var metaFile = zip.zipEntries.getLocalFile (newMetaFileName);
        var metaData = VESPER.DWCAParser.parseMeta ($.parseXML (metaFile.uncompressedFileData));
        return {jszip: zip, meta: metaData};
    };


    // Read in csv files that are zip entries. Use selectedStuff and readField to pick out
    // which columns to snatch out the zip parsing routines.
    this.filterReadZipEntriesToMakeModel = function (zip, mdata) {
        var selectedStuff = DWCAHelper.getAllSelectedFilesAndFields (mdata);
        var fileRows = {};
        VESPER.log ("ZIP:", zip);

        // read selected data from zip
        $.each (selectedStuff, function (key, value) {
            var fileData = mdata.fileData[key];
            var fileName = zip.dwcaFolder + fileData.fileName;
            var readFields = NapVisLib.newFilledArray (fileData.invFieldIndex.length, false);

            $.each (value, function (key, value) {
                readFields [fileData.fieldIndex[key]] = value;
            });

            VESPER.log ("readFields", readFields);
            VESPER.DWCAZipParse.set (fileData, readFields);
            zip.zipEntries.readLocalFile (fileName, VESPER.DWCAZipParse.zipStreamSVParser2);
            fileRows[fileData.rowType] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
            VESPER.DWCAParser.updateFilteredLists (fileData, readFields);
        });

        if (VESPER.alerts) { alert ("mem monitor point 1"); }

        // make taxonomy (or list)
        return new DWCAModel (mdata, VESPER.DWCAParser.setupStrucFromRows (fileRows, mdata));
    };


    $.fn.filterNode = function(name) {
        return this.find('*').filter(function() {
            VESPER.log (this);
            return this.nodeName ? (this.nodeName.toUpperCase() == name.toUpperCase()) : false;
        });
    };


    // Get attribute defaults from dwca.xsd file
    this.makeRowTypeDefaults = function (xsdFile) {
        var wat = xsdFile.find('xs\\:attributeGroup[name="fileAttributes"], attributeGroup[name="fileAttributes"]');
        var ffrag = $(wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var val = xmlthis.attr('default');
            var type = xmlthis.attr ('type');
            if (type == "xs:integer") {
                val = +val;
            }
            VESPER.DWCAParser.rowTypeDefaults[xmlthis.attr('name')] = val;
        });

        VESPER.log ("rtd", VESPER.DWCAParser.rowTypeDefaults);
    };


    this.makeFieldAttrNames = function (xsdFile) {
        var wat = xsdFile.find('xs\\:complexType[name="fieldType"], complexType[name="fieldType"]');
        var ffrag = $(wat);
        //VESPER.log ("WAT", wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var name = xmlthis.attr ('name');
            var type = xmlthis.attr ('type');
            VESPER.DWCAParser.fieldAttrNames[name] = type;
        });

        VESPER.log ("fan", VESPER.DWCAParser.fieldAttrNames);
    };

    // load in xsd and populate arrays/maps from it.
    this.loadxsd ('dwca.xsd');

	
	function getCurrentTerm (term) {
		var newTerm = altTerms [term];
		return (newTerm === undefined ? term : newTerm);
	}


	this.occArray2JSONArray = function (tsvData, idx) {
		var jsonObj = {};
        if (VESPER.alerts) { alert ("mem monitor point 1.4"); }

		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec !== undefined) {
                var id = rec[idx];
                jsonObj[id] = {};
                jsonObj[id][this.TDATA] = rec;
            }
		}
		
		return jsonObj;
	};

    function addToArrayProp (obj, pname, addObj) {
        if (!obj[pname]) {
            obj[pname] = [];
        }
        obj[pname].push (addObj);
    }

	// This uses implicit id linking in the dwca file i.e. acceptedNameUsageID to parentNameUsageID
	this.taxaArray2JSONTree = function (tsvData, fileData, metaData) {
        var fieldIndexer = fileData.filteredFieldIndex;
        var idx = fileData.idIndex;
		var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5"); }
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];

		
		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec !== undefined) {
                var id = rec[idx];
                var pid = rec[hidx];
                var pRec = jsonObj[pid];

                if (pid != id && pRec != undefined) {	// no self-ref loops and parent must exist
                    // Make child taxa lists
                    addToArrayProp (pRec, VESPER.DWCAParser.TAXA, jsonObj[id]);
                }
                else if (pRec == undefined) {
                    // Make synonym lists
                    var aid = rec[aidx];
                    if (id != aid && aid !== undefined) {
                        var aRec = jsonObj[aid];
                        if (aRec != undefined) {
                            addToArrayProp (aRec, VESPER.DWCAParser.SYN, jsonObj[id]);
                            //delete jsonObj[id];
                        }
                    }
                }
            }
		}
		
		var roots = this.findRoots (jsonObj, idx, fieldIndexer);
		this.createSuperroot (jsonObj, roots, fileData, metaData, fieldIndexer);
		VESPER.log ("roots", roots);
	
		VESPER.log ("JSON", jsonObj[1], jsonObj);
		return {"records":jsonObj, "tree":jsonObj};
	};


    // This uses explicit id linking in the dwca file i.e. kingdom, order, family etc data
    this.taxaArray2ExplicitJSONTree = function (tsvData, fileData, metaData, addOriginalTo) {
        var idx = fileData.idIndex;
        var fieldIndexer = fileData.filteredFieldIndex;
        var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5a ex"); }
        VESPER.log ("SPECS", VESPER.DWCAParser.SPECS);
        var rankList = VESPER.DWCAParser.explicitRanks;
        console.log ("Vesper adds", metaData.vesperAdds);
        var nameField = fieldIndexer[metaData.vesperAdds.nameLabelField.fieldType];
        var rootObjs = {};
        var rLen = rankList.length;
        // Make a taxonomy from the explicitly declared ranks

        var data = jsonObj;

        // I am separating the jsonObj from the tree organising structure here, as mixing integer and string property names
        // causes massive slowdown in webkit broswers (chrome 29 and opera 15 currently).
        // http://stackoverflow.com/questions/18895840/webkit-javascript-object-property-iteration-degrades-horribly-when-mixing-intege
        var treeObj = {};
        //treeObj = jsonObj; // revert

        for (var n = 0, len = tsvData.length; n < len; n++) {
            var rec = tsvData[n];

            if (rec !== undefined) {

                var lastData;
                var path = [];
                for (var r = 0; r < rLen; r++) {
                    var rank = rankList[r];
                    var rankField = fieldIndexer[rank];

                    if (rankField) {
                        var val = rec[rankField];

                        if (val) {
                            if (!treeObj[val]) {
                                var rdata = [];
                                rdata[idx] = val;
                                rdata[nameField] = val;
                                rdata[fieldIndexer["taxonRank"]] = rank;
                                var obj = {};
                                obj[this.TDATA] = rdata;
                                treeObj[val] = obj;

                                if (lastData) {
                                    addToArrayProp (lastData, VESPER.DWCAParser.TAXA, obj);
                                }
                            }

                            if (!lastData) {
                                rootObjs[val] = true;
                            }
                            lastData = treeObj[val];
                        }
                    }
                }

                if (lastData) {
                    addOriginalTo (lastData, jsonObj[rec[idx]], treeObj, rec[nameField], idx, fieldIndexer, nameField)
                }
            }
        }

        var roots = d3.keys (rootObjs);
        this.createSuperroot (treeObj, roots, fileData, metaData, fieldIndexer);
        VESPER.log ("roots", roots);

        VESPER.log ("json", jsonObj, "tree", treeObj);
        return {"records":jsonObj, "tree":treeObj};
    };


    this.addOriginalAsSpecimenEntry = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        var val = name;
        if (!taxa[val]) {
            var rdata = [];
            rdata[idx] = val;
            rdata[nameField] = val;
            rdata[fieldIndexer["taxonRank"]] = "Species";
            var obj = {};
            obj[VESPER.DWCAParser.TDATA] = rdata;
            taxa[val] = obj;

            if (lastData) {
                addToArrayProp (lastData, VESPER.DWCAParser.TAXA, taxa[val]);
            }

            //VESPER.log (val, taxa[val]);
        }
        addToArrayProp (taxa[val], VESPER.DWCAParser.SPECS, orig);
    };

    this.addOriginalAsLeaf = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        addToArrayProp (lastData, VESPER.DWCAParser.TAXA, orig);
    };
	


	this.addExtRows2JSON = function (jsonData, extRowData, rowDescriptor) {
        var coreIDIndex = rowDescriptor.idIndex;

		var unreconciled = [];
		if (extRowData && (coreIDIndex != undefined)) {
            var extIndex = rowDescriptor.extIndex;
			for (var i = 0, len = extRowData.length; i < len; i++) {
				var dataRow = extRowData [i];

                if (dataRow !== undefined) {
                    var coreid = dataRow[coreIDIndex];

                    if (coreid != undefined) {
                        var jsonins = jsonData[coreid];

                        if (jsonins != undefined) {
                            if (! jsonins[this.EXT]) {
                                jsonins[this.EXT] = [];
                            }
                            var jsonExt = jsonins[this.EXT];
                            addToArrayProp (jsonExt, extIndex, dataRow);
                        }
                    }
                    else {
                        unreconciled.push (i);
                    }
                }
			}
		}
		
		return unreconciled;
	};
	
	
	
	this.makeTreeFromAllFileRows = function (theFileRows, metaData) {
		var rowDescriptors = metaData.fileData;
		var coreFileData = rowDescriptors[metaData.coreRowType];
		var jsoned;
		if (NapVisLib.endsWith (metaData.coreRowType, "Taxon")) {
			jsoned = this.taxaArray2JSONTree (theFileRows[coreFileData.rowType], coreFileData, metaData);
		} else if (NapVisLib.endsWith (metaData.coreRowType, "Occurrence")) {
            jsoned = this.taxaArray2ExplicitJSONTree (theFileRows[coreFileData.rowType], coreFileData, metaData,
                VESPER.DWCAParser.addOriginalAsSpecimenEntry
            );
		}
  		
  		for (var indRowDescriptorProp in rowDescriptors) {
  			if (rowDescriptors.hasOwnProperty (indRowDescriptorProp)) {
  				var indRowDescriptor = rowDescriptors[indRowDescriptorProp];
                if (metaData.coreRowType !== indRowDescriptor.rowType && indRowDescriptor.selected) {
                    var unreconciled = this.addExtRows2JSON (jsoned.records, theFileRows[indRowDescriptor.rowType], indRowDescriptor);
                    VESPER.log ("unreconciled in ",indRowDescriptorProp, unreconciled);
                }
  			}
  		}

  		return jsoned;
	};
	

	
	this.setupStrucFromRows = function (theFileRows, metaData) {
  		var struc = this.makeTreeFromAllFileRows (theFileRows, metaData);
        if (VESPER.alerts) { alert ("mem monitor point 2"); }
    	struc.root = struc.tree["-1000"]; //this.createSuperroot (struc, this.findRoots (struc, fieldIndex), fieldIndex);
    	if (struc.root) {
    		this.countDescendants (struc.root);
    	}
        if (VESPER.alerts) { alert ("mem monitor point 3"); }
        VESPER.log ("root", struc.root);
    	return struc;
	};
	
	
	this.findRoots = function (jsonObj, idx, fieldIndexer) {
		var roots = [];
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];

		if (aidx !== undefined && hidx !== undefined) {
			for (var taxonProp in jsonObj) {
				if (jsonObj.hasOwnProperty (taxonProp)) {
					var taxon = jsonObj[taxonProp];
					var rec = taxon[this.TDATA];

                    if (rec !== undefined) {
                        var id = rec[idx];
                        var aid = rec[aidx];
                        var pid = rec[hidx];
                        if ((id == aid || aid == undefined) && (pid == id || jsonObj[pid] == undefined)) { //Not a synonym, and parentid is same as id or parentid does not exist. possible root
                            roots.push (taxonProp);
                        }
                    }
				}
			}
		}
		
		return roots;
	};
	
	
	this.createSuperroot = function (jsonObj, roots, fileData, metaData, fieldIndexer) {
		if (roots.length == 0) {
			return undefined;
		}
		
		if (roots.length == 1) {
            jsonObj["-1000"] = jsonObj[roots[0]];
			return jsonObj[roots[0]];
		}

        var nameField = fieldIndexer[metaData.vesperAdds.nameLabelField.fieldType];
        var idName = fileData.invFieldIndex[fieldIndexer["id"]];
        var nameName = fileData.invFieldIndex[nameField];

		var hidx = fieldIndexer["parentNameUsageID"];
		var srID = "-1000";
		var srData = {
            //id: srID,
            acceptedNameUsageID: srID,
            parentNameUsageID: srID,
            acceptedNameUsage: VESPER.DWCAParser.SUPERROOT,
            taxonRank: VESPER.DWCAParser.SUPERROOT,
            nameAccordingTo: "dwcaParse.js"
		};
        srData[nameName] = VESPER.DWCAParser.SUPERROOT;
        srData[idName] = srID;
		var srObj = {};
	
		srObj[this.TAXA] = [];
		for (var n = 0; n < roots.length; n++) {
			srObj[this.TAXA].push (jsonObj[roots[n]]);	// add root as child taxon of superroot
			jsonObj[roots[n]][VESPER.DWCAParser.TDATA][hidx] = srID;	// make superroot parent taxon of root
		}
		
		srObj[VESPER.DWCAParser.TDATA] = [];
		for (var prop in srData) {
			if (srData.hasOwnProperty (prop)) {
                if (fieldIndexer[prop] !== undefined) {
				    srObj[VESPER.DWCAParser.TDATA][fieldIndexer[prop]] = srData[prop];
                }
			}
		}
		
		VESPER.log ("superroot", srObj);

        jsonObj[srID] = srObj;  // add it to the json obj so it gets treated like a node everywhere else
		return srObj;	
	};
	
	
	/* Recursively counts descendants, starting from a given taxon (usually root) */
	this.countDescendants = function (taxon) {
		if (taxon[this.TAXA] != undefined) {
            taxon.dcount = 0;
			for (var n = 0; n < taxon[this.TAXA].length; n++) {
				taxon.dcount += this.countDescendants (taxon[this.TAXA][n]);
			}
		}
		return (taxon.dcount || (taxon[VESPER.DWCAParser.SPECS] ? taxon[VESPER.DWCAParser.SPECS].length : 0)) + 1;
	};


	
	this.parseMeta = function (theXML) {
  		var fileData = {};
  		
  		var coreRowType = this.getCoreRowType (theXML);
  		fileData[coreRowType] = this.parseCore (theXML, coreRowType);
  		
  		var extRowTypes = this.getExtensionRowTypes (theXML);
  		for (var n = 0; n < extRowTypes.length; n++) {
  			fileData [extRowTypes[n]] = this.parseExtension (theXML, extRowTypes[n], n);
  		}

  		var metaData = {"coreRowType":coreRowType, "extRowTypes":extRowTypes, "fileData":fileData, "vesperAdds":{}};
  		VESPER.log ("metadata", metaData);
  		return metaData;
	};
	
	
	
	this.parseCore = function (theXML, coreRowType) {
		return this.parseFrag (theXML, 'archive core[rowType="'+coreRowType+'"]', 'id', coreRowType);
	};
	
	
	this.parseExtension = function (theXML, extensionRowType, index) {
		var extObj = this.parseFrag (theXML, 'extension[rowType="'+extensionRowType+'"]', 'coreid', extensionRowType);
        extObj.extIndex = index;
        return extObj;
	};
	
	
	this.parseFrag = function (theXML, fragQ, idAttrName, rowType) {
        VESPER.log ("thexml", typeof theXML, theXML);
		var frag = $(theXML).find(fragQ);
        var ffrag = $(frag[0]);

        var fileData = {};
		var fileNames = ffrag.find('files location').contents();
        fileData.fileName = fileNames[0].data;
        fileData.rowType = rowType;
        fileData.mappedRowType = this.recordURIMap [rowType] || rowType;
        for (var attrName in this.rowTypeDefaults) {
            if (this.rowTypeDefaults.hasOwnProperty (attrName)) {
                // AARGH. Remember, there is a difference between something being undefined and an empty value.
                // Both equate to false, but only one (attribute is undefined) says there is no
                // such attribute there and we should fall back to the default.
                // The other, the attribute has been given an empty value, means the value is empty and we should use that, not the default.
                // Caused Error. Grrrr.
                //if (ffrag.attr(attrName) === undefined)
                fileData[attrName] = (ffrag.attr(attrName) !== undefined ? ffrag.attr(attrName) : this.rowTypeDefaults[attrName]);
                VESPER.log ("att", attrName, "#", fileData[attrName], "#")
            }
        }
        VESPER.log (ffrag.attr("fieldsEnclosedBy"));


		var idIndex = +ffrag.find(idAttrName).attr('index'); // '+' makes it a number not a string
        fileData.idIndex = idIndex;
		var fields = ffrag.find('field');
		
		VESPER.log ("fieldsTerminatedBy", fileData.fieldsTerminatedBy);
		
		fileData.fieldIndex = {}; fileData.invFieldIndex = [];
        fileData.fieldData = {};
        fileData.fieldIndex[idAttrName] = idIndex;
        fileData.invFieldIndex[idIndex] = idAttrName;
		for (var fidx = 0; fidx < fields.length; fidx++) {
            var fXml = $(fields[fidx]);
            var fieldAttrs = {};
            for (var fieldAttr in VESPER.DWCAParser.fieldAttrNames) {
                if (VESPER.DWCAParser.fieldAttrNames.hasOwnProperty (fieldAttr)) {
                    var fieldAttrType = VESPER.DWCAParser.fieldAttrNames[fieldAttr];
                    var val = fXml.attr (fieldAttr);
                    if (fieldAttrType == "xs:integer") {
                        val = +val; // '+' makes it a number not a string
                    }
                    fieldAttrs[fieldAttr] = val;
                }
            }
            fieldAttrs.shortTerm = getCurrentTerm (chopToLastSlash (fieldAttrs.term));
            var index = fieldAttrs.index;
            var fieldName = fieldAttrs.shortTerm;
            fieldAttrs.discreteTermList = (VESPER.DWCAParser.discreteTermSet[fieldName] ? {} : undefined);

           // VESPER.log ("FieldAttrs:", fieldAttrs);

			if (!isNaN(index)) {
                fileData.fieldIndex[fieldName] = index;
                fileData.invFieldIndex[fileData.fieldIndex[fieldName]] = fieldName;
			}

            fileData.fieldData[fieldName] = fieldAttrs;
		}

        fileData.filteredFieldIndex = {}; //$.extend ({}, fileData.fieldIndex);
        fileData.filteredInvFieldIndex = []; //fileData.invFieldIndex.slice();
		
		VESPER.log ("filenames: ", fileNames);
		return fileData;
	};


    this.updateFilteredLists = function (fileData, presentFieldIndex) {
        var i = 0;
        fileData.filteredInvFieldIndex.length = 0;
        var idName = fileData.invFieldIndex[fileData.idIndex];
        $.each(fileData.filteredFieldIndex, function (n) {
            if (n != idName) {
                fileData.filteredFieldIndex[n] = undefined;
            }
        });

        for (var n = 0; n < presentFieldIndex.length; n++) {
            if (presentFieldIndex[n]) {
                var name = fileData.invFieldIndex [n];
                fileData.filteredFieldIndex[name] = i;
                fileData.filteredInvFieldIndex[i] = name;
                i++;
            }
        }

        VESPER.log ("fi", fileData.fieldIndex, fileData.filteredFieldIndex, fileData.invFieldIndex, fileData.filteredInvFieldIndex);
    };
	
	
	this.getCoreRowType = function (theXML) {
		var frags = $(theXML).find('core');
		var term = $(frags[0]).attr('rowType');	// should only be 1
		VESPER.log ("core", term);
		return term;
	};
	
	this.getExtensionRowTypes = function (theXML) {
		var frags = $(theXML).find('extension');
		var types = [];
		for (var n = 0; n < frags.length; n++) {
			var term = $(frags[n]).attr('rowType');
			types.push (term);
		}
		
		return types;
	};

    this.getFilteredIdIndex = function (metaData) {
        var coreData = metaData.fileData[metaData.coreRowType];
        return coreData.filteredFieldIndex [coreData.invFieldIndex [coreData.idIndex]];
    };

	
	function chopToLastSlash (term) {
		var chop = (term ? term.lastIndexOf("/") + 1 : -1);
		return (chop > 0) ? term.substring (chop) : term;
	}

    this.selectNodes = function (regex, selectorFunc, model, setSelectionFunc) {
        var count = 0;
        var data = model.getData();

        if (regex !== undefined && regex.length > 0) {
            for (var prop in data) {
                if (data.hasOwnProperty(prop)) {
                    var dataItem = data[prop];
                    var match = selectorFunc (model, dataItem, regex);
                    if (match) {
                        count++;
                        setSelectionFunc (prop);
                    }
                }
            }
        }

        return count;
    }
};