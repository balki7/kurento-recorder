var ws_uri = 'wss://172.19.14.231:8433/kurento';
var file_uri = 'file:///tmp/callee_recorder_demo.webm';

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

    var answerButton = document.getElementById('answer');
    answerButton.addEventListener('click', answer);
});

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

        kurentoClient(ws_uri, function (error, client) {
            if (error) return onError(error);
            client.create('MediaPipeline', function (error, pipeline) {
                if (error) return onError(error);

                console.log("Got MediaPipeline");

                var elements =
                    [
                        {type: 'RecorderEndpoint', params: {uri: file_uri}},
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

function answer() {
    console.log("onClick");

    createClient("callee", "videoInput1", "videoOutput1", function (client, peer, endpoint, recorder) {
        var offer = $("#offer_answer").val();
        peer.processOffer(offer, function (error, answer) {
            if (error) return onError(error);

            endpoint.gatherCandidates(onError);

            client.connect(endpoint, recorder, function(error) {
                if (error) return onError(error);

                // recorder.record(function(error) {
                //     if (error) return onError(error);
                //     alert("Connected");
                // });
            });

            $("#offer_answer").val(answer);
            $("#offer_answer").css("color", "red");
        });
    });
}

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