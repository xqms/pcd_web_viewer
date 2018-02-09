pcd_web_viewer
==============

`pcd_web_viewer` is a WebGL pointcloud viewer targeted for use with the
[PCL] pointcloud library.

Features:

  * Reads binary PCD files directly
  * Colorization using RGB channel, or coloring according to X, Y, or Z value
  * Configuration through URL
  * JavaScript library usable in own HTML sites
  * Data files are loaded in a streaming manner, i.e. points start showing
    while the file is being downloaded.

`pcd_web_viewer` is based on [srv/pointcloud_web_viewer], but was heavily
modified to parse binary and ascii PCD files.

Usage
-----

Just put the repository somewhere where a web server can serve it. For quick
testing, you can install [caddy] and run `caddy` in the repository.

Visit `viewer.html?load=data/pointcloud.pcd` with your browser, where
`data/pointcloud.pcd` is a binary PCD file relative to `viewer.html`.

License
-------

`pcd_web_viewer` is released under the BSD-3 license.

Status
------

JS is not my native programming language - if some JS guru wants to make things
nicer patches are very welcome. It would also be nice to make `pcd_web_viewer`
available via Bower.

Author
------

Max Schwarz <max.schwarz@online.de>

[PCL]: http://www.pointclouds.org/
[caddy]: https://github.com/mholt/caddy
[srv/pointcloud_web_viewer]: https://github.com/srv/pointcloud_web_viewer.git
