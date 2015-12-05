
/*
 * Load a specially formatted .bin file
 */

function loadBinFile(uri, vertices, colors, progress, success)
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

	var numPoints = 0;

	var BYTE_PER_POINT = 3*4 + 3;
	var leftoverData = new Uint8Array();

	function handlePointData(view, off) {
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

		if(off + BYTE_PER_POINT > view.buffer.byteLength)
		{
			console.log('Invalid point offset', off);
			return;
		}

		var x = view.getFloat32(off + 0, true);
		var y = view.getFloat32(off + 4, true);
		var z = view.getFloat32(off + 8, true);
		var r = view.getUint8(off + 12);
		var g = view.getUint8(off + 13);
		var b = view.getUint8(off + 14);

		updateStats(x, stats.x);
		updateStats(y, stats.y);
		updateStats(z, stats.z);

		vertices[numPoints].x = x;
		vertices[numPoints].y = y;
		vertices[numPoints].z = z;
		colors[numPoints].r = r / 255.0;
		colors[numPoints].g = g / 255.0;
		colors[numPoints].b = b / 255.0;

		numPoints++;
	}

	var handleData = function(buffer, filesize) {
		view = new DataView(buffer);
		off = 0;

		stats.x.dirty = false;
		stats.y.dirty = false;
		stats.z.dirty = false;

		// Decide whether we need to extend the arrays
		var n = Math.floor(buffer.byteLength / BYTE_PER_POINT);
		if(leftoverData.length + buffer.byteLength >= BYTE_PER_POINT)
			n++;

		var minGeomSize = Math.max(filesize / BYTE_PER_POINT, numPoints + n);

		// Pre-extend to minGeomSize
		for(var i = vertices.length; i < minGeomSize; ++i)
		{
			vertices[i] = new THREE.Vector3(0, 0, 0);
			colors[i] = new THREE.Color(0);
		}

		// Process data left over from last chunk
		if(leftoverData.byteLength != 0 && leftoverData.length + buffer.byteLength >= BYTE_PER_POINT)
		{
			var array = new Uint8Array(BYTE_PER_POINT);
			array.set(leftoverData, 0);
			array.set(new Uint8Array(buffer.slice(0, BYTE_PER_POINT - leftoverData.length)), leftoverData.length);
			var leftoverView = new DataView(array.buffer);
			handlePointData(leftoverView, 0);
			off = BYTE_PER_POINT - leftoverData.length;
			leftoverData = new Uint8Array(0);
		}

		while(off + BYTE_PER_POINT <= buffer.byteLength)
		{
			handlePointData(view, off);
			off += 15;
		}

		// Save any left over data
		var newleftover = new Uint8Array(leftoverData.length + buffer.byteLength - off);
		newleftover.set(leftoverData, 0);
		newleftover.set(new Uint8Array(buffer.slice(off, buffer.byteLength)), leftoverData.length);
		leftoverData = newleftover;

		progress(stats, numPoints);
	}

	// Start streaming
	streamURI(getUrlParameter('load'), {
		data: handleData,
		success: success
	});
}
