function Webcam(scene) {
  var video, videoImageContext, videoTexture, videoImage, inited = false;

  videoImage = document.createElement('canvas');
  videoTexture = new THREE.Texture(videoImage);

  function init() {
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    var URL = window.URL || window.webkitURL;

    getUserMedia = getUserMedia.bind(navigator);

    var camvideo = document.createElement('video');

    camvideo.autoplay = true;
    camvideo.width = 640;
    camvideo.height = 480;

    if (!getUserMedia) {
      alert('Sorry. <code>navigator.getUserMedia()</code> is not available.');
    } else {
      getUserMedia({ video: true }, gotStream, noStream);
    }

    function gotStream(stream) {
      console.log('gotStream');

      if (URL) {
        camvideo.src = URL.createObjectURL(stream);
      } else {
        camvideo.src = stream;
      }

      camvideo.onerror = function(e) {
        console.error('camvideo.onerror', e);

        stream.stop();
      };

      stream.onended = noStream;

      inited = true;
    }

    function noStream(e) {
      var msg = 'No camera available.';

      if (e.code == 1) {
        msg = 'User denied access to use camera.';
      }

      alert(msg);
    }

    video = camvideo;

    videoImage.width = 640;
    videoImage.height = 480;

    videoImageContext = videoImage.getContext('2d');

    // background color if no video present
    videoImageContext.fillStyle = '#0000ff';
    videoImageContext.fillRect(0, 0, videoImage.width, videoImage.height);

    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    var movieMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, overdraw: true, side: THREE.DoubleSide });

    // the geometry on which the movie will be displayed;
    // 		movie image will be scaled to fit these dimensions.
    var movieGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);

    var movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);

    movieScreen.position.set(100, 10, 100);

    //scene.add(movieScreen);
  }

  function render() {
    if (inited && video.readyState === video.HAVE_ENOUGH_DATA) {
      videoImageContext.drawImage(video, 0, 0, videoImage.width, videoImage.height);

      if (videoTexture) videoTexture.needsUpdate = true;
    }
  }

  function getTexture() {
    return videoTexture;
  }

  return {
    init: init,
    render: render,
    getTexture: getTexture
  };
}

module.exports = Webcam;
