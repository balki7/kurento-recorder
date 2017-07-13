function getopts(args, opts) {
    var result = opts.default || {};
    args.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function ($0, $1, $2, $3) {
            result[$1] = decodeURI($3);
        });

    return result;
};

var args = getopts(location.search,
    {
        default: {
            ws_uri: 'wss://' + location.hostname + ':8433/kurento',
            file_uri: 'file:///tmp/caller_recorder_demo.webm', // file to be stored in media server
            ice_servers: undefined
        }
    });

function setIceCandidateCallbacks(webRtcPeer, webRtcEp, onerror) {
    webRtcPeer.on('icecandidate', function (candidate) {
        console.log("Local candidate:", candidate);

        candidate = kurentoClient.getComplexType('IceCandidate')(candidate);

        webRtcEp.addIceCandidate(candidate, onerror)
    });

    webRtcEp.on('OnIceCandidate', function (event) {
        var candidate = event.candidate;

        console.log("Remote candidate:", candidate);

        webRtcPeer.addIceCandidate(candidate, onerror);
    });
}

window.addEventListener('load', function (event) {
    console = new Console()

    var callButton = document.getElementById('call');
    callButton.addEventListener('click', call);
});

function call() {
    console.log("onClick");

    if (args.ice_servers) {
        console.log("Use ICE servers: " + args.ice_servers);
        options.configuration = {
            iceServers: JSON.parse(args.ice_servers)
        };
    } else {
        console.log("Use freeice")
    }

    createClient("caller", "videoInput1", "videoOutput1", function (client, peer, endpoint, recorder) {
        peer.generateOffer(function(error, offer){
            if (error) return onError(error);
            $("#offer_answer").val(offer);

            var answerButton = document.getElementById('answer');
            answerButton.addEventListener('click', function(){
                var answer = $('#offer_answer').val();
                peer.processAnswer(answer, function(){
                    client.connect(endpoint, function(error) {
                        if (error) return onError(error);

                        alert("Connected");
                        //recorder.record(function(error) {
                          //  if (error) return onError(error);
                        //});
                    });
                });
            });
        });
    });
}

var createClient = function (id, inputId, outputId, callback) {
    var videoInput = document.getElementById(inputId);
    var videoOutput = document.getElementById(outputId);

    showSpinner(videoInput, videoOutput);

    var options = {
        localVideo: videoInput,
        remoteVideo: videoOutput
    };

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
        if (error) return onError(error);

        kurentoClient(args.ws_uri, function (error, client) {
            if (error) return onError(error);
            client.create('MediaPipeline', function (error, pipeline) {
                if (error) return onError(error);

                console.log("Got MediaPipeline");

                var elements =
                    [
                        {type: 'RecorderEndpoint', params: {uri: 'file:///tmp/' + id + '.webm'}},
                        {type: 'WebRtcEndpoint', params: {}}
                    ]

                pipeline.create(elements, function (error, elements) {
                    if (error) return onError(error);

                    var recorder = elements[0];
                    var webRtc = elements[1];

                    setIceCandidateCallbacks(webRtcPeer, webRtc, onError);

                    callback(client, webRtcPeer, webRtc, recorder);
                });
            });
        });
    });
};

function onError(error) {
    if (error) console.error(error);
}

function showSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].poster = 'img/transparent-1px.png';
        arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
    }
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});