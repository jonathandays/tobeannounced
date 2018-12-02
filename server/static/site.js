var Site = function () {
        var TOAST_TIME = 2000;
        var TOAST_ERROR = 0;
        var TOAST_INFO = 1;
        var TOAST_SUCCESS = 2;
        var MAX_INPUT_LENGHT = 40;
        var TITLE_DELAY = 400;
        var roomCode  = "";
        var playerId = "";

        var socket = io('http://68.183.61.99:80');

        socket.on('question_started', function(question){
            console.log("Question Started: " + JSON.stringify(question));
            if(question.options) {
                removeContent(showButtons, question.options);
            }
            else {
                removeContent(showInput, question.prompt);
            }
        });

        socket.on('timeout', function(data){
            console.log("Question Timeout: " + JSON.stringify(data));
            removeContent(function(){});
        });

        socket.on('game_started', function(data){
            console.log("Game Started: " + JSON.stringify(data));
            hideLoading();
            removeContent(function(){});
        });

        socket.on('end_game', function(data){
            console.log("Game Ended: " + JSON.stringify(data));
            var image = "lobby.png";
            $('html').css("background-image", "url('"+ image +"')");
            removeContent(showLobby, TITLE_DELAY);
        });

        socket.on('player_join_response', function(player){
            console.log(player);
            if(player.message === "game not found!") {
                hideLoading();
                toast("Room code is invalid!", TOAST_ERROR);
            }
            else {
                playerId = player.id;
                hideLoading();
                var image = "science_color.png";
                $('html').css("background-image", "url('"+ image +"')");
                //toast("Connected successfully!", TOAST_SUCCESS);
                removeContent(showWaiting, 500);
            }
        });

        var toast = function(message, type){
            $('.message-text').css({"color": "white"}); 
            if(type == TOAST_ERROR)
                $('.message').css({"background-color": "red"}); 
            else if(type == TOAST_SUCCESS)
                $('.message').css({"background-color": "green"}); 
            else {
                $('.message').css({"background-color": "#ffffcc"}); 
                $('.message-text').css({"color": "#333333"}); 
            }
            $('.message').css({opacity:0});
            $('.message-text').text(message);
            var height = $('.message').height()*-1;
            $('.message').css({top:height});
            $('.message').css({opacity:1});
            $('.message').animate({top:0}, 200, function(){
                setTimeout(function(){
                    $('.message').animate({top: height}, 200, function(){
                        $('.message').css({opacity:0});
                    });
                }, TOAST_TIME);
            });
        };

        var showLoading = function() {
            $('.loader').fadeIn();
        };

        var hideLoading = function() {
            $('.loader').fadeOut();
        };

        var validateConect = function(nickname, code) {
            if(!nickname) {
                toast("Nickname cannot be empty", TOAST_ERROR);
                return false;
            }
            if(!code) {
                toast("Room code cannot be empty", TOAST_ERROR);
                return false;
            }
            if(code.length != 5) {
                toast("Room code is invalid", TOAST_ERROR);
                return false;
            }
            return true;
        };

        var removeContent = function(callback, param){
            $('div.game-content').animate({opacity:0}, 500,function(){
                $('div.game-content').html('');
                callback(param);
            })
        };

        var handleGameOptionClick = function(){
            $('.game-option').on('click', function(){
                var oid = $(this).data('oid');
                socket.emit("question_answer", {room_code: roomCode, index: oid, player_id: playerId});
                removeContent(function(){});
            });
        };

        var showButtons = function(options){
            if(!options) {
                toast("Something went wrong...", TOAST_ERROR);
                return;
            }
            var count = 0;
            var size = options.length;
            var html = "";
            for(var i = 0;i< size;i++) {
                html += "<div class='lobby-control'><button data-oid='" + count + "' class='box-shadow game-option'>" + options[i] + "</button></div>";
                count++;
            }
            $('div.game-content').html(html);
            $('div.game-content').animate({opacity:1}, 500);
            handleGameOptionClick();
        };

        var handleSendButtonClick = function(){
            $('.send-button').on('click', function(){
                var input = $('#game-input').val();
                if(!input) {
                    toast("Input cannot be empty", TOAST_ERROR);
                    return;
                }
                console.log("sending!");
            });
        };
        var showInput = function(text) {
            if(!text) {
                toast("Something went wrong...", TOAST_ERROR);
                return;
            }
            var html = "<div class='lobby-control'><label class='text-shadow center-text big-text' for='game-input'>"+ text +"</label><input class='box-shadow' placeholder='Fill in the blank' id='game-input' maxlength='40'/></div><div class='lobby-control'><button class='box-shadow send-button'>Send</button></div>";
            $('div.game-content').html(html);
            $('div.game-content').animate({opacity:1}, 500);
            handleSendButtonClick();
        };

        var handleConnect = function(){
            $('#connect').on('click', function(e){
                e.preventDefault();
                $(this).blur();
                var nickname = $('#name').val();
                var code = $('#room').val();
                if(validateConect(nickname, code)) {
                    showLoading();
                    roomCode = code;
                    socket.emit("player_join", { room_code: code, name: nickname });
                }
            });
        };

        var showLobby = function(delay){
            var html = "<div class='lobby-control'><label class='text-shadow' for='name'>Nickname</label><input class='box-shadow' id='name' type='text' maxlength='12'></div><div class='lobby-control'><label class='text-shadow' for='room'>Room Code</label><input class='box-shadow' id='room' type='text' maxlength='5'></div><div class='lobby-control'><button id='connect' class='box-shadow'>Connect</button></div>";
            $('div.game-content').html(html);
            $('div.game-content').delay(TITLE_DELAY).animate({opacity:1}, 650);
            handleConnect();
        }

        var showWaiting = function(delay){
            var html = "<div class='lobby-control'><h1 class='text-shadow' style='color:white; text-align:center; margin-top:50%;'>WAITING TO START...</h1></div>";
            $('div.game-content').html(html);
            $('div.game-content').delay(TITLE_DELAY).animate({opacity:1}, 650);
            //handleConnect();
        }

        // var handleFAQ = function(){
        //     // Get the modal
        //     var modal = document.getElementById('faqModal');

        //     // Get the <span> element that closes the modal
        //     var span = document.getElementsByClassName("close")[0];

        //     // When the user clicks the button, open the modal 
        //     $('.info-btn').on('click', function(){
        //         $('.question-answer').css('display', 'none');
        //         $('.question-answer').first().css('display', 'block');
        //         //$('.question-answer').first().slideDown();
        //         modal.style.opacity = 0;
        //         modal.style.display = "block";
        //         $('#faqModal').animate({opacity:1}, 300);
        //     });

        //     // When the user clicks on <span> (x), close the modal
        //     span.onclick = function() {
        //         $('#faqModal').animate({opacity:0}, 300, function(){
        //             modal.style.display = "none";
        //         });
        //     }

        //     // When the user clicks anywhere outside of the modal, close it
        //     window.onclick = function(event) {
        //         if (event.target == modal) {
        //             $('#faqModal').animate({opacity:0}, 300, function(){
        //                 modal.style.display = "none";
        //             });
        //         }
        //     }

        //     $('.question-title').on('click',function(){
        //         var $answer = $(this).parent().find('.question-answer');
        //         if($answer.css('display')=="block") {
        //             //$answer.slideUp();
        //             return;
        //         }
        //         $('.question-answer').slideUp();
        //         $answer.slideDown();
        //     });
        // };

        return {
            Init: function () {
                $('h1.lobby-title').animate({opacity:1}, 400);
                removeContent(showLobby, TITLE_DELAY);
                //handleFAQ();

                //$('.info-btn').click();
                // $(document)
                // .one('focus.autoExpand', 'textarea.autoExpand', function(){
                //     var savedValue = this.value;
                //     this.value = '';
                //     this.baseScrollHeight = this.scrollHeight;
                //     this.value = savedValue;
                // })
                // .on('input.autoExpand', 'textarea.autoExpand', function(){
                //     var minRows = this.getAttribute('data-min-rows')|0, rows;
                //     this.rows = minRows;
                //     rows = Math.ceil((this.scrollHeight - this.baseScrollHeight) / 16);
                //     this.rows = minRows + rows;
                //     if(this.value.length > MAX_INPUT_LENGHT) {
                //         this.value = this.value.substring(0, MAX_INPUT_LENGHT);
                //     }
                // });
            }
        }
    }();