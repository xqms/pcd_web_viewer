
/*
 * Load a PCL .pcd file
 */

function loadPCDFile(uri, transform, vertices, colors, progress, success)
{
	// Collect some statistics during loading (useful for pointcloud coloring)
	var stats = new Object();

	stats.x = new Object();
	stats.x.min = Infinity;
	stats.x.max = -Infinity;
	stats.x.dirty = false;

	stats.y = new Object();
	stats.y.min = Infinity;
	stats.y.max = -Infinity;
	stats.y.dirty = false;

	stats.z = new Object();
	stats.z.min = Infinity;
	stats.z.max = -Infinity;
	stats.z.dirty = false;

	stats.pcd = new Object();

	var fields = [];
	var pointSize = 0;

	var numPoints = 0;

	var leftoverData = new Uint8Array();
	var headerLine = '';

	var STATE_HEADER = 0;
	var STATE_DATA_BINARY = 1;
	var STATE_DATA_ASCII = 2;
	var parseState = STATE_HEADER;

	function handleHeaderLine(line) {

		// Ignore comments
		if(line.length == 0 || line[0] == '#')
			return;

		items = line.trim().split(' ');

		if(items.length < 2)
			return;

		switch(items[0]) {
			case 'VERSION':
				stats.pcd.version = items[1];
				break;
			case 'FIELDS':
				for(var i = 1; i < items.length; ++i)
				{
					var field = new Object;
					field.name = items[i];
					field.count = 1;
					fields.push(field);
				}
				break;
			case 'SIZE':
				for(var i = 1; i < items.length; ++i)
				{
					var size = parseInt(items[i])
					fields[i-1].size = size;
				}
				break;
			case 'TYPE':
				for(var i = 1; i < items.length; ++i)
				{
					fields[i-1].type = items[i];
				}
				break;
			case 'COUNT':
				for(var i = 1; i < items.length; ++i)
				{
					fields[i-1].count = parseInt(items[i]);
				}
				break;
			case 'WIDTH':
				stats.width = parseInt(items[1]);
				break;
			case 'HEIGHT':
				stats.height = parseInt(items[1]);
				break;
			case 'VIEWPOINT':
				// TODO
				break;
			case 'POINTS':
				// redundant to width + height
				break;
			case 'DATA':
				// Calculate total size of one point in bytes
				for(var i = 0; i < fields.length; ++i)
				{
					var field = fields[i];
					pointSize += field.count * field.size;

					switch(field.type) {
						case 'F':
							switch(field.size) {
								case 4:
									if(field.name == 'rgb')
									{
										// Special insane ROS pcd format
										field.read = function(view, off) {
											return new THREE.Color(
												view.getUint8(off+0) / 255.0,
												view.getUint8(off+1) / 255.0,
												view.getUint8(off+2) / 255.0
											);
										};
									}
									else
										field.read = function(view, off) { return view.getFloat32(off, true); };
									break;
								case 8:
									field.read = function(view, off) { return view.getFloat64(off, true); };
									break;
								default:
									throw "Invalid float size";
							}
							break;
						case 'I':
							switch(field.size) {
								case 1:
									field.read = function(view, off) { return view.getInt8(off, true); };
									break;
								case 2:
									field.read = function(view, off) { return view.getInt16(off, true); };
									break;
								case 4:
									field.read = function(view, off) { return view.getInt32(off, true); };
									break;
								default:
									throw "Invalid int size";
							}
							break;
						case 'U':
							switch(field.size) {
								case 1:
									field.read = function(view, off) { return view.getUint8(off, true); };
									break;
								case 2:
									field.read = function(view, off) { return view.getUint16(off, true); };
									break;
								case 4:
									field.read = function(view, off) { return view.getUint32(off, true); };
									break;
								default:
									throw "Invalid uint size";
							}
							break;
					}
				}
				console.log('PCD point size:', pointSize);

				// Pre-extend to width*height
				for(var i = 0; i < stats.width * stats.height; ++i)
				{
					vertices[i] = new THREE.Vector3(0, 0, 0);
					colors[i] = new THREE.Color(0);
				}

				switch(items[1]) {
					case 'ascii':
						parseState = STATE_DATA_ASCII;
						break;
					case 'binary':
						parseState = STATE_DATA_BINARY;
						break;
				}
				break;
			default:
				console.warn('Unknown PCD header field:', items[0]);
		};
	}

	function handleBinaryPointData(view, off) {
		function updateStats(v, stats) {
			if(v < stats.min) {
				stats.min = v - 0.3;
				stats.dirty = true;
			}
			if(v > stats.max) {
				stats.max = v + 0.3;
				stats.dirty = true;
			}
		}

		if(off + pointSize > view.buffer.byteLength)
		{
			console.log('Invalid point offset', off);
			return;
		}

		var vec = new THREE.Vector3(0.0, 0.0, 0.0);

		for(var i = 0; i < fields.length; ++i)
		{
			var field = fields[i];

			for(var j = 0; j < field.count; ++j)
			{
				var value = field.read(view, off);
				off += field.size;

				switch(field.name)
				{
					case 'x': vec.x = value; break;
					case 'y': vec.y = value; break;
					case 'z': vec.z = value; break;
					case 'rgb':
						colors[numPoints] = value;
						break;
				}
			}
		}

		vec.applyMatrix4(transform);

		updateStats(vec.x, stats.x);
		updateStats(vec.y, stats.y);
		updateStats(vec.z, stats.z);

		if(vertices[numPoints] == undefined)
			console.log(off, view.buffer.byteLength, numPoints, vertices.length);

		vertices[numPoints] = vec;

		numPoints++;
	}

	function handleAsciiPointData(x,y,z) {
		function updateStats(v, stats) {
			if(v < stats.min) {
				stats.min = v - 0.3;
				stats.dirty = true;
			}
			if(v > stats.max) {
				stats.max = v + 0.3;
				stats.dirty = true;
			}
		}

		var vec = new THREE.Vector3(0.0, 0.0, 0.0);

		vec.x = x;
		vec.y = y;
		vec.z = z;
		colors[numPoints] = new THREE.Color(0.87, 0.87, 0.87);

		vec.applyMatrix4(transform);

		updateStats(vec.x, stats.x);
		updateStats(vec.y, stats.y);
		updateStats(vec.z, stats.z);

		if(vertices[numPoints] == undefined)
			console.log('HATA');

		vertices[numPoints] = vec;

		numPoints++;
	}
	
	function handleBinaryData(buffer, off) {
		var view = new DataView(buffer);

		// Process data left over from last chunk
		if(leftoverData.byteLength != 0 && leftoverData.length + buffer.byteLength >= pointSize)
		{
			var array = new Uint8Array(pointSize);
			array.set(leftoverData, 0);
			array.set(new Uint8Array(buffer.slice(off, off + pointSize - leftoverData.length)), leftoverData.length);
			var leftoverView = new DataView(array.buffer);
			handleBinaryPointData(leftoverView, 0);
			off += pointSize - leftoverData.length;
			leftoverData = new Uint8Array(0);
		}

		while(off + pointSize <= buffer.byteLength)
		{
			if(numPoints >= stats.width*stats.height)
				return;

			handleBinaryPointData(view, off);
			off += pointSize;
		}

		// Save any left over data
		var newleftover = new Uint8Array(leftoverData.length + buffer.byteLength - off);
		newleftover.set(leftoverData, 0);
		newleftover.set(new Uint8Array(buffer.slice(off, buffer.byteLength)), leftoverData.length);
		leftoverData = newleftover;
	}

	function handleAsciiData(buffer, off) {
		var view = new DataView(buffer);

		for(; off < buffer.byteLength; ++off) {
			var c = view.getUint8(off);

			if(c == 10) // '\n'
			{
				var res = lineBuffer.split(" ");
				handleAsciiPointData(res[0],res[1],res[2]);
				lineBuffer = "";
				off = off + 1;
			}
			lineBuffer += String.fromCharCode(c);
		}
		return off;
	}

	
	var lineBuffer = "";

	function readHeaderLine(buffer, off) {
		var view = new DataView(buffer);

		for(; off < buffer.byteLength; ++off) {
			var c = view.getUint8(off);

			if(c == 10) // '\n'
			{
				handleHeaderLine(lineBuffer);
				lineBuffer = "";
				return off + 1;
			}

			lineBuffer += String.fromCharCode(c);
			//console.log(lineBuffer);
		}

		return off;
	}

	function handleData(buffer, filesize) {
		stats.x.dirty = false;
		stats.y.dirty = false;
		stats.z.dirty = false;
		
		var off = 0;
		while(off < buffer.byteLength)
		{
			switch(parseState)
			{
				case STATE_HEADER:
					off = readHeaderLine(buffer, off);
					break;
				case STATE_DATA_BINARY:
					handleBinaryData(buffer, off);
					off = buffer.byteLength;
					break;
				case STATE_DATA_ASCII:
					handleAsciiData(buffer, off);
					off = buffer.byteLength;
					break;
			}
		}

		progress(stats, numPoints);
	}

	// Start streaming
	streamURI(getUrlParameter('load'), {
		data: handleData,
		success: success
	});
}
