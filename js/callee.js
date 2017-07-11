/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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
            file_uri: 'file:///tmp/recorder_demo.webm', // file to be stored in media server
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

    var answerButton = document.getElementById('answer');
    answerButton.addEventListener('click', answer);
});

function answer() {
    console.log("onClick");

    var stopRecordButton = document.getElementById("stop")


    if (args.ice_servers) {
        console.log("Use ICE servers: " + args.ice_servers);
        options.configuration = {
            iceServers: JSON.parse(args.ice_servers)
        };
    } else {
        console.log("Use freeice")
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
                        callback({
                            client: client,
                            peer: webRtcPeer,
                            endpoint: webRtc,
                            recorder: recorder,
                            pipeline: pipeline
                        });
                    });
                });
            });
        });
    };

    createClient("callee", "videoInput1", "videoOutput1", function (client) {
        onOfferReceived(client, $("#offer_answer").val());
    });

    var onOfferReceived = function(client, offer){
        client.peer.processOffer(offer, function (error, answer) {
            if (error) return onError(error);

            console.log("offer");

            client.endpoint.gatherCandidates(onError);

            client.client.connect(client.endpoint, client.recorder, function(error) {
                if (error) return onError(error);

                console.log("Connected");

                client.recorder.record(function(error) {
                    if (error) return onError(error);
                    console.log("record");
                });
            });

            $("#offer_answer").val(answer);
        });
    }
}

function onError(error) {
    if (error) console.log(error);
}

function showSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].poster = 'img/transparent-1px.png';
        arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
    }
}

function hideSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].src = '';
        arguments[i].poster = 'img/webrtc.png';
        arguments[i].style.background = '';
    }
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});