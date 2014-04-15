// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();

      var faq = document.getElementById("faq");
      $(faq).hover(function() {
          var more_faq = document.getElementById("more_faq");
          $(more_faq).show();
        }, function() {
          $(more_faq).hide();
        }
       );
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://shining-fire-6358.firebaseio.com/");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    
    var info = document.getElementById("info");
    info.innerHTML = "Welcome to Vemoji. To join the chat, share this URL: "+ "<b>" + document.location.origin+"/#"+fb_chat_room_id +"</b>";

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome to Vemoji! Vemoji is a chatting application that lets you send video emoji.  Chat like normal, but when you submit an emoticon, you'll have the chance to choose a part of your face to send instead. Smile or quirk your eyebrows, stick out your tongue or roll your eyes. Alternate with your friend, and make composite faces! Ready to chat? Choose a username!");
    if(!username){
       var username = "anonymous"+Math.floor(Math.random()*1111);
    }
     fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      //console.log("keydown");
      if (event.which == 13) {
        var msg = $(this).val();
        if(has_emotions(msg)){
          //$(this).val("");
          //console.log("has emotions");

          var msg_blob = cur_video_blob;

          var vid_height = 150;
          //var vid_width = 200;
          var stripe_height = vid_height/4;

          var edit_menu = document.getElementById("edit_menu");
          $(edit_menu).show();

          var edit_vid = document.getElementById("edit_vid");
          edit_vid.style.height = vid_height + "px";
          //edit_vid.style.width = vid_width + "px";
          edit_vid.type="video/webm"
          edit_vid.src = URL.createObjectURL(base64_to_blob(msg_blob));
          edit_vid.loop = true;
          edit_vid.autoplay = true;
          var center_y;
          //var center_y;

          var top_hider = document.getElementById("top_hider");
          var bottom_hider = document.getElementById("bottom_hider");

          // var submit_msg = username+": " + msg;
          // submit_msg = removeEmoticons(submit_msg);
          // if (emptyMessage(msg)) {
          //   submit_msg = "";
          //   //$(this).val("");
          // }

          orig_msg = msg;
          msg = removeEmoticons(msg);
          var submit_msg = username+": " + msg;
          if (msg.length == 0) {
            submit_msg = "";
          }

          $(edit_menu).mousemove(function( event ) {
            var mouse_x = event.pageX;
            var mouse_y = event.pageY;
            var vid_x = $('#edit_vid').offset().left;
            var vid_y = $('#edit_vid').offset().top;
            //center_x = mouse_x - vid_x;
            center_y = mouse_y - vid_y;
            // //console.log("Mouse: ", center_x, center_y);

            var top_height = center_y - stripe_height/2;
            $(top_hider).height(top_height); 

            var bottom_height = vid_height - top_height - stripe_height;
            $(bottom_hider).height(bottom_height); 
          });
   
          var obj = this;

          var cancel = document.getElementById("cancel");
          $(cancel).click(function (event){
            //console.log("cancel");
            msg_blob = null;
            submit_msg = username+": " + orig_msg;
            $(cancel).unbind("click");
          });
          // var redo = document.getElementById("redo");
          // $(redo).click(function (event) {
          //   //console.log("redo");
          //   msg_blob = null;
          //   submit_msg = "";
          //   $(redo).unbind("click");
          //   $("#submission input").trigger(jQuery.Event('keydown', {which: 13}));
          //   //console.log("end redo");
          // });

          $(edit_menu).click(function( event ) {
            //console.log("click");
            var top_height_proportion = $('#top_hider').height() / $('#edit_vid').height();
            var bottom_height_proportion = $('#bottom_hider').height() / $('#edit_vid').height();

            //console.log(top_height_proportion, bottom_height_proportion, top_height_proportion+bottom_height_proportion+1/4);
            fb_instance_stream.push({m:submit_msg, v:msg_blob, c: my_color, t: top_height_proportion, b: bottom_height_proportion});
            $(obj).val("");
            // scroll_to_bottom(0);
            $(edit_menu).hide();
            $(edit_menu).unbind("click");
          });
        }else{
          fb_instance_stream.push({m:username+": " + msg, c: my_color});
          $(this).val("");
        }
        // scroll_to_bottom(0);
      }
    });

    // scroll to bottom in case there is already content
    // scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    //console.log("display");
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      //for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; 
      video.loop = true;
      video.height = 120;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      //this container crops the view of the video
      var container = document.createElement("div");
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.display = "block";
      container.height = video.height;

      video.style.marginTop =  "-" +  (data.t*video.height).toString() + "px"; 
      video.style.marginBottom = "-" + ((1-(data.t+1/4))*video.height).toString() + "px";

      document.getElementById("conversation").appendChild(container);
      container.appendChild(video);
      //console.log("append");
      //data.m = "";
    }
    var convdiv = document.getElementById("conversation");
    scroll_to_bottom(convdiv, 0, convdiv.scrollHeight);
  }

  function scroll_to_bottom(div, wait_time, height){
    // scroll to bottom of div
    //var div = document.getElementById(div1);
    setTimeout(function(){
      $(div).animate({ scrollTop: height}, 200);
      //console.log("scrolling, height: ", height);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);
      $(webcam_stream).hide();

      // counter
      // var time = 0;
      // var second_counter = document.getElementById('second_counter');
      // var second_counter_update = setInterval(function(){
      //   second_counter.innerHTML = time++;
      // },1000);

      // now record stream in 2 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      //mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          ////console.log("new data available!");
          var instructions = document.getElementById("instructions");
          $(instructions).hide();
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(2000);
      }, 2000 );
      //console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":(", ";)", ":P", ":p", "-_-", ">_<", "O_O", ":D"];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }

  var removeEmoticons = function(msg) {
    var options = ["lol",":)",":(", ";)", ":P", ":p", "-_-", ">_<", "O_O", ":D"];
    options.forEach(function (elem) {
      msg = msg.replace(elem, "");
      //console.log(msg);
      //console.log(elem);
    });
    //console.log("msg: ", msg);
    return msg;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
