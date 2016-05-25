/*
 * Copyright 2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Convert a text representation to a graph.
 * 
 * @author Alex Boyko
 * @author Andy Clement
 */
define(function() {
	'use strict';
	
	function collapseOneLevel(prefix, obj, collector) {
		var type = typeof obj;
		if (obj == null) {
			collector[prefix] = null;
			return;
		}
		if (type === 'object') {
			Object.keys(obj).forEach(function(key) {
				collapseOneLevel(prefix.length==0?key:prefix+'.'+key,obj[key],collector);
			});
		} else if (type === 'array') {
			for (var i=0;i<obj.length;i++) {
				collapseOneLevel(prefix.length==0?key:prefix+'.'+i,obj[i],collector);
			}
		} else {
			collector[prefix] = obj;
		}
	}
	
	function collapse(obj) {
		var retval = {};
		collapseOneLevel('',obj,retval);
		console.log("collapsed = "+JSON.stringify(retval));
		return retval;
	}
	
	return function(input, flo, metamodel, metamodelUtils) {
     	// input is a string like this (3 nodes: foo, goo and hoo):   foo --a=b --c=d > goo --d=e --f=g>hoo
     	var trimmed = input.trim();
     	if (trimmed.length===0) {
     		return;
     	}
     	var integrationGraph = JSON.parse(input);
     	var nodes = integrationGraph.nodes;
     	var nodesMap = {};
     	for (var i=0;i<nodes.length;i++) {
     		var node = nodes[i];
            var group = metamodelUtils.matchGroup(metamodel, node.componentType, 1, 1);
            var stats = node.stats;
            var properties = collapse(node.stats);
     		var newNode = flo.createNode(metamodelUtils.getMetadata(metamodel,node.componentType,group),properties);
 			newNode.attr('.label/text',node.name);
 			nodesMap[node.nodeId] = newNode;
     	}
     	var links = integrationGraph.links;
     	for (var i=0;i<links.length;i++) {
     		var link = links[i];
     		var isErrorLink = false;
     		var fromPort = '.output-port';
     		var toName = nodesMap[link.to].attr('.label/text');
     		var fromName = nodesMap[link.from].attr('.label/text');
     		if (toName.toLowerCase().indexOf('error')!=-1) {
     			fromPort = '.error-port';
     			isErrorLink=true;
     		}
     		  var link = flo.createLink({'id': nodesMap[link.from].id,'selector': fromPort}, 
     				  		 {'id': nodesMap[link.to].id, 'selector': '.input-port'});
     		  if (isErrorLink) {
     			  link.attr('.connection/stroke','red');
     		  }
     	}
//     	var lines = trimmed.split('\n');
//     	for (var l=0;l<lines.length;l++) {
//     		var line = lines[l];
//     		var elements = line.split('>');
//         	var lastNode = null;
//     		for (var e=0;e<elements.length;e++) {
//     			var element = elements[e].trim();
//     			// Has properties?
//     			var startOfProps = element.indexOf(' ');
//     			var name = element;
//                	var properties = {};
//        			if (startOfProps !== -1) {
//     				name = element.substring(0,startOfProps);
//     				var propValues = element.substring(startOfProps+1).trim().split(' ');
//     				for (var p=0;p<propValues.length;p++) {
//     					var propValue = propValues[p].trim();
//     					if (propValue.length===0) {
//     						// allows for multiple spaces between options
//     						continue;
//     					}
//     					var equalsIndex = propValue.indexOf('=');
//     					// The 2 skips the '--'
//     					var key = propValue.substring(2,equalsIndex);
//     					var value = propValue.substring(equalsIndex+1);
//     					properties[key] = value;
//     				}
//     			}
//                var group = metamodelUtils.matchGroup(metamodel, name, 1, 1);
//     			var newNode = flo.createNode(metamodelUtils.getMetadata(metamodel,name,group),properties);
//     			newNode.attr('.label/text',name);
//     			if (lastNode) {
//	                    flo.createLink({'id': lastNode.id,'selector': '.output-port'}, 
//	                    		       {'id': newNode.id,'selector': '.input-port'});
//     			}
//     			lastNode = newNode;
//     		}
//     	}
	};
	
});