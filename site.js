String.prototype.replaceAll = function(str1, str2, ignore) 
{
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
} 

var apiKey = "";

var socket = io('http://68.183.61.99:80');
var state = "home";
var categorySelected = "";
var difficultySelected = "";

var currentPlayers = [];
var roomCode = "";
var questionIndex = -1;
var questions = [];
var answersReceived= 0;

var endOfRoundTexts = ["Oh boy... That was a difficult question....", "Come one guys... You can  do better than that...", "Wow.... That wasn't easy....", "Let the judging Begin! ...", "I wonder how many of you got that question right...."];
var cancelTimeout = false;
var timedout = false;
var QUESTION_TIMEOUT = 10000;//45000;
var INTRO_TEXT = "Hi... I'll be your host to today.... T B A is a trivia game that you can play with your friends..... You will be shown a prompt on the screen.... Then some options will appear on your devices.... You must answer the prompt by choosing the correct answer before the time is up.... There will be three rounds of three questions of increasing difficulty..... The first round each question is worth 180 points.... The second round each question is worth 360 points.... And on the last round, each question is worth a wooping 550 points.... At the end of all rounds the player with the most points wins.... Are you ready?.... Let's start the game...";
//var INTRO_TEXT = "Hi... Let's start the game.....";

var sound = new Howl({
    src: ['bg-music.mp3']
});

socket.on('game_created', function(data){
    roomCode = data.room_code;
    questions = data.questions;
    questionIndex = -1;
    hideLoading();
    $('#room-code').text(roomCode);
    $('#orange-bg-lobby').fadeIn(function(){
        $('#lobby-container').fadeIn(function(){
            $('#parrot-lobby').fadeIn();
            $('#moon-lobby').fadeIn();
        });
    });
});

socket.on('player_join_response', function(player){
    player.points = 0;
    currentPlayers.push(player);
    if(currentPlayers.length < 2) {
        $('#start-game-btn').addClass('disabled');
    }
    else {
        $('#start-game-btn').removeClass('disabled');
    }
    showPlayers();
});

socket.on('question_answered', function(answer){
    //TODO: Show that person answered

    //console.log("Question Answered: " + JSON.stringify(answer));
    if(!timedout) {
        answersReceived++;
        if(answersReceived === currentPlayers.length) {
            cancelTimeout = true;
            timedout = true;
            clearInterval(interval);
            socket.emit("timeout", { room_code: roomCode });
        }
    }
});

socket.on('answers', function(answers){
    for(var i = 0; i < answers.length; i++) {
        if(answers[i].selected_option === questions[questionIndex].correct_answer) {
            if(answers[i].player_id == currentPlayers[0].id) {
                currentPlayers[0].points += parseInt(roundPoints());
            }
            else if(answers[i].player_id === currentPlayers[1].id) {
                currentPlayers[1].points += parseInt(roundPoints());
            }
            else if(currentPlayers.length >= 3 && answers[i].player_id === currentPlayers[2].id) {
                currentPlayers[2].points += parseInt(roundPoints());
            }
            else if (currentPlayers.length == 4 && answers[i].player_id === currentPlayers[3].id) {
                currentPlayers[3].points += parseInt(roundPoints());
            }
        }
    }

    //console.log("Answers: " + JSON.stringify(answers));
    $('.parrot-timer').hide();
    $('.clocktimer').hide();
    $('#parrot-timer4').show();
    showLeaderboard();
});

var roundPoints = function(){
    if(questionIndex < 3) {
        return 180;
    }
    else if (questionIndex < 6) {
        return 360;
    }
    else {
        return 550;
    }
};

var showLeaderboard = function(){
    var textIndex = Math.floor((Math.random() * endOfRoundTexts.length));
    $('.cc').text(endOfRoundTexts[textIndex]);
    speak(endOfRoundTexts[textIndex], function(){
        $('.cc').text("Here is the correct answer");
        speak("Here is the correct answer", function(){
            for(var i = 0; i < questions[questionIndex].options.length; i++) {
                if(i != questions[questionIndex].correct_answer) {
                    $('.option-'+i).animate({opacity: 0}, 400);
                }
            }

            $('.question-choices-robot').animate({opacity: 0}, 400);
            var temp = '#robot'+(parseInt(questions[questionIndex].correct_answer)+2);
            $(temp).animate({opacity: 1}, 400);

            setTimeout(function(){
                if(currentPlayers.length > 0)
                    $('#player1Points').text(currentPlayers[0].points);
                else if(currentPlayers.length > 1)
                    $('#player2Points').text(currentPlayers[1].points);
                else if(currentPlayers.length > 2)
                    $('#player3Points').text(currentPlayers[2].points);
                else if(currentPlayers.length > 3)
                    $('#player4Points').text(currentPlayers[3].points);
                
                $('.cc').text("");
                $('#questions-contianer').fadeOut();
                $('.parrot-timer').hide();
                $('#leaderboard').fadeIn(function(){

                    if(currentPlayers.length >= 2) {
                        $('#player1PointsBar').animate({width: currentPlayers[0].points/2});
                        $('#player2PointsBar').animate({width: currentPlayers[1].points/2});
                    }
                    if(currentPlayers.length >= 3) {
                        $('#player3PointsBar').animate({width: currentPlayers[2].points/2});
                    }
                    if(currentPlayers.length === 4) {
                        $('#player4PointsBar').animate({width: currentPlayers[3].points/2});
                    }

                    console.log("Question Index: " + questionIndex);
                    if(questionIndex < questions.length-1) {
                        setTimeout(function(){
                            nextQuestion();
                        }, 5000);
                    }
                    else {
                        setTimeout(function(){
                            endGame();
                        }, 3000);
                    }
                });
            }, 3000);
        });
    });
};

var endGame = function() {
    var topPoints = 0;
    for(var i = 0; i < currentPlayers.length; i++) {
        if(parseInt(currentPlayers[i].points) > topPoints) {
            topPoints = currentPlayers[i].points;
        }
    }

    var winners = [];
    var indexes = []
    for(var i = 0; i < currentPlayers.length; i++) {
        if(parseInt(currentPlayers[i].points) === topPoints) {
            indexes.push(parseInt(i+1));
            winners.push(currentPlayers[i]);
        }
    }

    var text = "Congratulations... ";

    if(winners.length === 1) {
        text += "player " + indexes[0] + " won the game!";
    }
    else {
        text += "there was a draw between players ";
        for(var i = 0; i < winners.length; i++) {
            if(i == winners.length-1) {
                text += "and " + indexes[i] + " ";
            }
            else {
                text += indexes[i] + " ";
            }
        }
    }

    text += " ... Let's all give them a big round  of applause... See you next time...";

    $('.cc').text(text);

    speakOutro(text, function(){
        $('.cc').text("");
        socket.emit("end_game", {room_code: roomCode});
        Howler.volume(0.1);
        state = "home";
        categorySelected = "";
        difficultySelected = "";
        
        $('#splash').fadeIn(function(){
            setTimeout(function(){
                $('#splash').fadeOut(function(){
                    $('#orange-bg').fadeOut();
                    $('#orange-bg-lobby').fadeOut();
                    $('#orange-bg-question').fadeOut();
        
                    $('#category-title').fadeOut(function(){
                        $('#category-title').text('');
                        $('#category-title').show();
                    });
                    $('.container').fadeOut(function(){
                        $('#home-container').fadeIn(function(){
                            $('.category-panel').animate({height: $(window).height()}, 300, function(){
                                $('.category-panel-character-shadow').fadeIn();
                            }); 
                        });
                    });
                    hideBackButton();
                }); 
            }, 500);
        });
    });
};


var interval = {};
var countdown = 10;
var nextQuestion = function() {
    answersReceived= 0;
    cancelTimeout = false;
    questionIndex++;

    //console.log(questions)

    //console.log(questions[questionIndex]);

    $('.question-choices-robot').animate({"opacity": "0"});
    $('#robot1').animate({"opacity": "1"});
    $('#leaderboard').fadeOut();
    $('#question-text').text(questions[questionIndex].prompt.replaceAll("_", "____"));
    $('#answer-list').html("");

    for(var i = 0; i < questions[questionIndex].options.length; i++) {
        var html = "<li class='option-"+i+"'>"+ questions[questionIndex].options[i] +"</li>";
        $('#answer-list').append(html);
    }

    $('#questions-contianer').fadeIn();
    $('.parrot-timer').fadeOut();
    
    var textToSpeak = questions[questionIndex].prompt;
    textToSpeak = textToSpeak.replaceAll("_", "blank");

    speak(textToSpeak, function(){
        console.log('finished reading question')
        timedout = false;
        socket.emit("question_started", { room_code: roomCode, index: questionIndex });
        $('#parrot-timer1').fadeIn();
        $('.clocktimer').fadeIn();

        interval = setInterval(function() {
            countdown = countdown-1;
            if(countdown < 0) {
                $('.clocktimer').fadeOut();
                clearInterval(interval);
            }
            else {
                countdownNumberEl.textContent = countdown;
            }
        }, 1000);
        var countdownNumberEl = document.getElementById('countdown-number');
        countdown = 10;
        countdownNumberEl.textContent = countdown;

        setTimeout(function(){
            if(!cancelTimeout) {
                $('.parrot-timer').hide();
                $('#parrot-timer2').show();
            }
        }, QUESTION_TIMEOUT/3);

        setTimeout(function(){
            if(!cancelTimeout) {
                $('.parrot-timer').hide();
                $('#parrot-timer3').show();
            }
        }, 2*QUESTION_TIMEOUT/3);

        setTimeout(function(){
             if(!cancelTimeout) {
                timedout = true;
                socket.emit("timeout", { room_code: roomCode });
             }
        }, QUESTION_TIMEOUT);
    });
}

var startGame = function() {
    if(currentPlayers.length >= 2) {
        $('#player1PointsBar').width(0);
        $('#player2PointsBar').width(0);
        $('#player3PointsBar').width(0);
        $('#player4PointsBar').width(0);

        socket.emit('start_game', { room_code: roomCode });
        $('#lobby-container').fadeOut(function(){
            $('#orange-bg-question').fadeIn();
            $('.cc').text("");


            //speakIntro(INTRO_TEXT, function(){
                //nextQuestion();
            //});
            
            setTimeout(function(){
                
                $('#example-logo').fadeIn();
                $('.cc').text("Hi! I'll be your host for today. T.B.A is a trivia game that you can play with your friends."); //
                speak("Hi! I'll be your host for today. T.B.A is a trivia game that you can play with your friends.", function(){
                    $('#example-logo').fadeOut();
                    $('#example-prompt').fadeIn();
                    $('.cc').text("You will be shown a prompt on the screen.");
                    speak("You will be shown a prompt on the screen.", function(){
                        $('#example-prompt').fadeOut();
                        $('#example-device').fadeIn();
                        $('.cc').text("Then some options will appear on your devices."); 
                        speak("Then some options will appear on your devices.", function(){
                            $('#example-device').fadeOut();
                            $('#example-timer').fadeIn();
                            $('.cc').text("You must answer the prompt by choosing the correct answer before the time is up.");
                            speak("You must answer the prompt by choosing the correct answer before the time is up.", function(){
                                $('#example-timer').fadeOut();
                                $('#example-points').fadeIn();
                                $('.cc').text('There will be three rounds of three questions of increasing difficulty.')
                                speak("There will be three rounds of three questions of increasing difficulty.", function(){
                                    $('#example-points1').fadeIn();
                                    $('.cc').text('The first round each question is worth 180 points.')
                                    speak("The first round each question is worth 180 points.", function(){
                                        $('#example-points2').fadeIn();
                                        $('.cc').text('The second round each question is worth 360 points.')
                                        speak("The second round each question is worth 360 points.", function(){
                                            $('#example-points3').fadeIn();
                                            $('.cc').text('And on the last round, each question is worth a wooping 550 points.')
                                            speak("And on the last round, each question is worth a wooping 550 points.", function(){
                                                $('.cc').text("At the end of all rounds the player with the most points wins. Are you ready? Let's start the game.");
                                                speak("At the end of all rounds the player with the most points wins. Are you ready? Let's start the game.", function(){
                                                    $('#example-points').fadeOut();
                                                    $('.cc').text("");
                                                    nextQuestion();
                                                });
                                            });
                                        });
                                    });
                                });
                                                                    
                            });                                                    
                        });
                    });
                });

                // $('#example-logo').fadeIn(function(){
                //     setTimeout(function(){
                //         $('#example-logo').fadeOut(function(){
                //             speak("You will be shown a prompt on the screen.", function(){});
                //             $('.cc').text("You will be shown a prompt on the screen."); //
                //             $('#example-prompt').fadeIn(function(){
                //                 setTimeout(function(){
                //                     $('#example-prompt').fadeOut(function(){
                //                         speak("Then some options will appear on your devices.", function(){});
                //                         $('.cc').text("Then some options will appear on your devices."); //
                //                         $('#example-device').fadeIn(function(){
                //                             setTimeout(function(){
                //                                 $('#example-device').fadeOut(function(){
                //                                     speak("You must answer the prompt by choosing the correct answer before the time is up.", function(){});
                //                                     $('.cc').text("You must answer the prompt by choosing the correct answer before the time is up."); //
                //                                     $('#example-timer').fadeIn(function(){
                //                                         setTimeout(function(){
                //                                             $('#example-timer').fadeOut(function(){
                //                                                 setTimeout(function(){
                //                                                     speak("There will be three rounds of three questions of increasing difficulty. The first round each question is worth 180 points. The second round each question is worth 360 points. And on the last round, each question is worth a wooping 550 points.", function(){});
                //                                                     $('.cc').text('There will be three rounds of three questions of increasing difficulty. The first round each question is worth 180 points. The second round each question is worth 360 points. And on the last round, each question is worth a wooping 550 points.')
                //                                                     $('#example-points').fadeIn(function(){
                //                                                         setTimeout(function(){ $('#example-points1').fadeIn(); },1000);
                //                                                         setTimeout(function(){ $('#example-points2').fadeIn(); },5000);
                //                                                         setTimeout(function(){ $('#example-points3').fadeIn(
                //                                                             function(){
                //                                                                 speak("At the end of all rounds the player with the most points wins. Are you ready? Let's start the game.", function(){});
                //                                                                 $('.cc').text("At the end of all rounds the player with the most points wins. Are you ready? Let's start the game.");
                //                                                                 setTimeout(function(){ $('#example-points').fadeOut(function(){
                //                                                                     $('.cc').text("");
                //                                                                     nextQuestion();
                //                                                                 }); }, 4000);
                //                                                             }
                //                                                         ); },11000);
                //                                                     });
                //                                                 }, 5000);
                //                                             });
                //                                         },3000);
                //                                     });
                //                                 });
                //                             },3000);
                //                         });
                //                     });
                //                 }, 3000);
                //             });
                //         });
                //     },4000)
                // });
            },2000);
        });
    }
};

var speakIntro = function(message, callback) {
    Howler.volume(0.05);

    // var msg = new SpeechSynthesisUtterance();
    // var voices = window.speechSynthesis.getVoices();

    // msg.voice = voices[0];
    // msg.rate = 10 / 10;
    // msg.pitch = 1;
    // msg.text = message;

    // msg.onend = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };
    // msg.onerror = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };
    // msg.onpause = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };
    meSpeak.speak(message, {wordGap: 10, variant: "m7", pitch: 40, speed: 160}, function(){
        callback();
        setTimeout(function(){
            Howler.volume(0.1);
        }, 1000);
    });
    
    // setTimeout(function(){
    //     callback();
    //     setTimeout(function(){
    //         Howler.volume(0.1);
    //     }, 1000);    
    // }, 46000);

    //speechSynthesis.speak(msg);
};

var speakOutro = function(message, callback) {
    Howler.volume(0.05);

    // var msg = new SpeechSynthesisUtterance();
    // var voices = window.speechSynthesis.getVoices();

    // msg.voice = voices[0];
    // msg.rate = 10 / 10;
    // msg.pitch = 1;
    // msg.text = message;

    // msg.onend = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };
    // msg.onerror = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };
    // msg.onpause = function() {
    //     setTimeout(function(){
    //         callback();
    //         setTimeout(function(){
    //             Howler.volume(0.1);
    //         }, 1000);
    //     }, 1000);
    // };

    meSpeak.speak(message, {wordGap: 10, variant: "m7", pitch: 40, speed: 160}, function(){
        callback();
        setTimeout(function(){
            Howler.volume(0.1);
        }, 1000);
    });

    // setTimeout(function(){
    //     callback();
    //     setTimeout(function(){
    //         Howler.volume(0.1);
    //     }, 1000);
    // }, 13000);
    // speechSynthesis.speak(msg);
};

var speak = function(message, callback){
    Howler.volume(0.05);
    // var msg = new SpeechSynthesisUtterance();
    // var voices = window.speechSynthesis.getVoices();
    
    // msg.voice = voices[0];
    // msg.rate = 10 / 10;
    // msg.pitch = 1;
    // msg.text = message;

    // speechSynthesis.speak(msg);

    meSpeak.speak(message, {wordGap: 10, variant: "m7", pitch: 40, speed: 160}, function(){
        callback();
        setTimeout(function(){
            Howler.volume(0.1);
        }, 1000);
    });

    // setTimeout(function(){
    //     callback();
    //     setTimeout(function(){
    //         Howler.volume(0.1);
    //     }, 1000);
    // }, 3000);
};

var showLoading = function(){ $('#loading').fadeIn(); };
var hideLoading = function(){ $('#loading').fadeOut(); };

var showBackButton = function() {
    $('#back-button').fadeIn();
};

var hideBackButton = function() {
    $('#back-button').fadeOut();
};

var backButtonPressed = function(){
    if(state === "difficultySelector") {
        home();
    }
    else if (state === "lobby") {
        categorySelect(categorySelected)
    }
};

var categorySelect = function(category) {
    state = "difficultySelector";
    categorySelected = category;
    difficultySelected = "";

    $('.lobby-bg').fadeOut();
    
    if(categorySelected==="biology") {
        $('#orange-bg').fadeIn();
        $('#parrot-difficulty').fadeIn();
    }

    $('#category-title').hide(function(){
        $('#category-title').text(category.toUpperCase());
        $('#category-title').fadeIn();
    });
    $('#lobby-container').fadeOut();
    $('#home-container').fadeOut(function(){
        $('#difficulty-container').fadeIn();
    });
    showBackButton();
};

var difficultySelect = function(difficulty) {
    state = "lobby"
    difficultySelected = difficulty;
    $('#difficulty-container').fadeOut(function(){
        socket.emit('create_game', { difficulty: difficultySelected, category: categorySelected });
        currentPlayers = [];
        questions = [];
        questionIndex = -1;
        showPlayers();
        $('#leaderboard').hide();
    });
};

var showPlayers = function(){
    if(currentPlayers.length === 0)
    {
        $('#player1').animate({"opacity": "0"}, 300, function(){});
        $('#player2').animate({"opacity": "0"}, 300, function(){});
        $('#player3').animate({"opacity": "0"}, 300, function(){});
        $('#player4').animate({"opacity": "0"}, 300, function(){});

        $('.player1Name').text("");
        $('.player2Name').text("");
        $('.player3Name').text("");
        $('.player4Name').text("");

        $('.leaderboard-player1').hide();
        $('.leaderboard-player2').hide();
        $('.leaderboard-player3').hide();
        $('.leaderboard-player4').hide();
    }
    else if(currentPlayers.length === 1)
    {
        $('#player1').animate({"opacity": "1"}, 300, function(){});
        $('#player2').animate({"opacity": "0"}, 300, function(){});
        $('#player3').animate({"opacity": "0"}, 300, function(){});
        $('#player4').animate({"opacity": "0"}, 300, function(){});

        $('.player1Name').text(currentPlayers[0].player_name.toUpperCase());
        $('.player2Name').text("");
        $('.player3Name').text("");
        $('.player4Name').text("");

        $('.leaderboard-player1').show();
        $('.leaderboard-player2').hide();
        $('.leaderboard-player3').hide();
        $('.leaderboard-player4').hide();
    }
    else if(currentPlayers.length === 2)
    {
        $('#player1').animate({"opacity": "1"}, 300, function(){});
        $('#player2').animate({"opacity": "1"}, 300, function(){});
        $('#player3').animate({"opacity": "0"}, 300, function(){});
        $('#player4').animate({"opacity": "0"}, 300, function(){});

        $('.player1Name').text(currentPlayers[0].player_name.toUpperCase());
        $('.player2Name').text(currentPlayers[1].player_name.toUpperCase());
        $('.player3Name').text("");
        $('.player4Name').text("");

        $('.leaderboard-player1').show();
        $('.leaderboard-player2').show();
        $('.leaderboard-player3').hide();
        $('.leaderboard-player4').hide();
    }
    else if(currentPlayers.length === 3)
    {
        $('#player1').animate({"opacity": "1"}, 300, function(){});
        $('#player2').animate({"opacity": "1"}, 300, function(){});
        $('#player3').animate({"opacity": "1"}, 300, function(){});
        $('#player4').animate({"opacity": "0"}, 300, function(){});

        $('.player1Name').text(currentPlayers[0].player_name.toUpperCase());
        $('.player2Name').text(currentPlayers[1].player_name.toUpperCase());
        $('.player3Name').text(currentPlayers[2].player_name.toUpperCase());
        $('.player4Name').text("");

        $('.leaderboard-player1').show();
        $('.leaderboard-player2').show();
        $('.leaderboard-player3').show();
        $('.leaderboard-player4').hide();
    }
    else if(currentPlayers.length === 4)
    {
        $('#player1').animate({"opacity": "1"}, 300, function(){});
        $('#player2').animate({"opacity": "1"}, 300, function(){});
        $('#player3').animate({"opacity": "1"}, 300, function(){});
        $('#player4').animate({"opacity": "1"}, 300, function(){});

        $('.player1Name').text(currentPlayers[0].player_name.toUpperCase());
        $('.player2Name').text(currentPlayers[1].player_name.toUpperCase());
        $('.player3Name').text(currentPlayers[2].player_name.toUpperCase());
        $('.player4Name').text(currentPlayers[3].player_name.toUpperCase());


        $('.leaderboard-player1').show();
        $('.leaderboard-player2').show();
        $('.leaderboard-player3').show();
        $('.leaderboard-player4').show();
    }
};

var home = function() {
    $('.cc').text("");
    Howler.volume(0.1);
    state = "home";
    categorySelected = "";
    difficultySelected = "";
    
    $('#splash').fadeIn(function(){
        setTimeout(function(){
            $('#splash').fadeOut(function(){
                $('#orange-bg').fadeOut();
                $('#orange-bg-lobby').fadeOut();
                $('#orange-bg-question').fadeOut();
    
                $('#category-title').fadeOut(function(){
                    $('#category-title').text('');
                    $('#category-title').show();
                });
                $('.container').fadeOut(function(){
                    $('#home-container').fadeIn(function(){
                        $('.category-panel').animate({height: $(window).height()}, 300, function(){
                            $('.category-panel-character-shadow').fadeIn();
                        }); 
                    });
                });
                hideBackButton();
            }); 
        }, 3000);
    });
};