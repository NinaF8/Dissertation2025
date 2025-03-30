/******************************************************************************/
/*** Preamble *****************************************************************/
/******************************************************************************/

/*
Participants alternate between two trial types:

Picture selection trials, where they hear audio from their partner (in fact recorded
audio from our confederate) and select the matching picture from 2 possibilities. 

Picture description trials, where they see a picture and produce a description for
their partner (clicking a mic icon to start and stop recording). 

We simulate the confederate preparing to speak and making a selection based on the 
participant's productions by inserting variable-duration "waiting for partner" screens.

We are interested in whether, on critical trials, the construction used by the partner
(featuring a redundant colour adjective) influences the description the participant 
produces.

The picture selection trials work in essentially the same was as picture selection
trials in the perceptual learning experiment.

Picture description trials are a series of html-audio-response trials, where we use 
the html stimulus to present a pair of images.
*/

/******************************************************************************/
/*** Initialise jspsych *******************************************************/
/******************************************************************************/

/*
As usual, we will dump all the trials on-screen at the end so you can see what's
going on. Note that data on critical trials is saved trial-by-trial as the experiment
runs, so unlike the word learning experiment we don't need to save all the data at 
the end of the experiment.
*/

var jsPsych = initJsPsych({
  on_finish: function () {
    jsPsych.data.displayData("csv"); //dump the data to screen
  },
});


/******************************************************************************/
/*** Generate a random participant ID *****************************************/
/******************************************************************************/

/*
We'll generate a random participant ID when the experiment starts, and use this
to save a separate set of data files per participant.
*/
var images_to_preload = [];

var participant_id = jsPsych.randomization.randomID(10);


/******************************************************************************/
/*** Random waits *************************************************************/
/******************************************************************************/

/*
At several points in the code we want to generate a random wait, to simulate the
confederate participant pondering what to say or hunting for the correct image.
The random_wait function below will return a number between 1800 and 3000, which
be used as the delay (in milliseconds) on screens where the participant is waiting 
for the confederate.
*/

function random_wait() {
  return 2000 + Math.floor(Math.random() * 1200);
}

function longer_random_wait() {
  return 10000 + Math.floor(Math.random() * 1200);
}

function typing_random_wait() {
  return 5000 + Math.floor(Math.random() * 1200);
}
/******************************************************************************/
/*** Waiting for partner to join **********************************************/
/******************************************************************************/

var waiting_room = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<p style="font-size: 30px;"> Waiting for partner to join... </p>',
  choices: "NO_KEYS",
  trial_duration: longer_random_wait,
};   

/******************************************************************************/
/*** Picture selection trials *************************************************/
/******************************************************************************/

function make_picture_selection_trial(prompt, targetImage, distractorImage) {
  //add target_image and foil_image to our preload list
  images_to_preload.push(targetImage);
  images_to_preload.push(distractorImage);

  //generate random wait and random order of images
  var wait_duration = typing_random_wait();
  var shuffled_image_choices = jsPsych.randomization.shuffle([
    targetImage,
    distractorImage,
  ]);

//trial for the delay before the partner starts speaking
/*
var waiting_for_partner = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "Processing...",
  prompt: "<p><em>Click on the picture your partner described</em></p>",
  choices: shuffled_image_choices,
  trial_duration: wait_duration,
  response_ends_trial: false, //just ignore any clicks the participant makes here!
  button_html: function (choice) {
    return '<button class="jspsych-btn"> <img src="images/' + choice + '.png" style="width: 250px"></button>'
  }
};

*/

var waiting_for_partner = {
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    // Only display the "Processing..." message with animated ellipses
    return `
      <div id="processing-container">
        <p>Waiting for partner<span id="dots"></span></p>
      </div>`;
  },
  prompt: "<p><em>Click on the picture your partner described</em></p>",
  choices: shuffled_image_choices,
  trial_duration: wait_duration,
  response_ends_trial: false, // Ignore participant clicks during this phase
  button_html: function (choice) {
    // Render buttons with images
    return `<button class="jspsych-btn">
              <img src="images/${choice}.png" style="height: 400px">
            </button>`;
  },
  on_load: function () {
    var dotsElement = document.getElementById("dots");
    var dotCount = 0;

    // Interval to simulate typing with ellipses
    var interval = setInterval(function () {
      dotCount = (dotCount + 1) % 4; // Cycle through 0, 1, 2, 3
      dotsElement.textContent = ".".repeat(dotCount); // Update ellipses
    }, 500);

    // Stop the ellipses animation when the trial ends
    setTimeout(function () {
      clearInterval(interval);
    }, wait_duration);
  },
};
  //audio trial
  var selection_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: prompt,
    prompt: "<p><em>Click on the picture your partner described</em></p>",
    choices: shuffled_image_choices,
    data: { participant_task: "picture_selection" }, //add a note that this is a picture selection trial
    save_trial_parameters: {choices: true}, //and we want to save the trial choices
    button_html: function (choice) {
      return '<button class="jspsych-btn"> <img src="images/' + choice + '.png" style="height: 400px"></button>'
    },
    post_trial_gap: 800, //a little pause after the participant makes their choice
    on_finish: function (data) {
      var button_number = data.response;
      data.button_selected = data.choices[button_number];
      save_confederate_priming_data(data); //save the trial data
    },
  };
  var full_trial = { timeline: [waiting_for_partner, selection_trial] };
  return full_trial;
}


/******************************************************************************/
/*** Picture description trials ********************************************/
/******************************************************************************/

function make_picture_description_trial (prompt, targetImage, distractorImage) {
  images_to_preload.push(targetImage);
  images_to_preload.push(distractorImage);
  
  var wait_duration = random_wait();

  var targetImage_as_html =
    "<img src=images/" +
    targetImage +
    ".png style='border:5px solid green; height:400px'>";
  var distractorImage_as_html =
    "<img src=images/" + distractorImage + ".png style='height:400px'>";

  var shuffled_images = jsPsych.randomization.shuffle([
    targetImage_as_html,
    distractorImage_as_html,
  ]);
  
  var composite_image = shuffled_images[0] + shuffled_images[1];
  var composite_image_with_prompt =
    composite_image + "<p><em>Describe the picture in the green box using the given word</em></p>" + "<p style='font-size: 24px; color: red;'>" + prompt + "</p>";
 /*
  var describe_image = {
    type: jsPsychSurveyHtmlForm,
    preamble: composite_image_with_prompt,
    html: '<p><input type="text" id="test-resp-box" name="response" size="30" /></p>',
    
     data: { participant_task: "picture_description" , //add a note that this is a picture description trial
             target: targetImage, //and record target and foil images
             foil: distractorImage}, 
     };
     */
     var describe_image = {
      type: jsPsychSurveyHtmlForm,
      preamble: composite_image_with_prompt,
      html: '<p><input type="text" id="test-resp-box" name="response" size="30" required /></p>',
      
      data: {
          participant_task: "picture_description",  // Note this is a picture description trial
          target: targetImage,  // Record target and foil images
          foil: distractorImage
      },
      
      on_finish: function(data) {
          // Capture the text response from the survey
          var textResponse = data.response.response;  // This is where the text input is stored
          
          // Add the text response to the trial data (you can modify this if you need to format it differently)
          data.textresponse = textResponse;
          
          // Call the existing save function to store the data
          save_confederate_priming_data(data);  // Save the trial data, including the text response
      }
  };

var waiting_for_partner = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    return `
      <div id='processing-message'><p>Waiting for your partner to select...</p></div>
      <div class="spinner"></div>
    `;
  },
  choices: "NO_KEYS",
  trial_duration: random_wait,
  on_load: function () {
    // Add CSS for the spinner
    var style = document.createElement('style');
    style.textContent = `
      .spinner {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 20px auto;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
};
  var full_trial = {
    timeline: [describe_image, waiting_for_partner],
  };
  return full_trial;

}

/******************************************************************************/
/*** Building an interaction timeline *****************************************/
/******************************************************************************/

var interaction_trials = [
  //filler
  make_picture_selection_trial("The old book on the shelf.", "fill_book", "d1"),
  //filler
  make_picture_description_trial("discovers", "fill_explorer", "d2"),
  //critical
  make_picture_selection_trial("The jeweler showed the rings to the couple.", "crit_jeweler", "d3"),
  //filler
  make_picture_description_trial("playful", "fill_puppy", "d4"),
  //filler
  make_picture_selection_trial("The pilot navigates storms.", "fill_pilot", "d5"),
  //critical
  make_picture_description_trial("showed",  "crit_patient", "d6"),
  //filler
  make_picture_selection_trial("The researcher conducts experiments.", "fill_researcher", "d7"),
  //filler
  make_picture_description_trial("dusty",  "fill_attic", "d8"),
  //filler
  make_picture_selection_trial("The curious cat.", "fill_cat", "d9"),
  //filler
  make_picture_description_trial("steers",  "fill_captain", "d10"),
  //critical
  make_picture_selection_trial("The secretary handed the businessman the document.", "crit_secretary", "d11"),
  //filler
  make_picture_description_trial("writes",  "fill_novelist", "d12"),
  //filler
  make_picture_selection_trial("The vet treats the dog.", "fill_vet", "d13"),
  //critical
  make_picture_description_trial("handed",  "crit_girl", "d14"),
  //filler
  make_picture_selection_trial("The detective solves mysteries.", "fill_detective", "d15"),
  //filler
  make_picture_description_trial("sews",  "fill_tailor", "d16"),
  //filler
  make_picture_selection_trial("The dog chases its tail.", "fill_dog", "d17"),
  //filler
  make_picture_description_trial("feeds",  "fill_zookeeper", "d18"),
  //critical
  make_picture_selection_trial("The market vendor gave the fruit to the customer.", "crit_vendor", "d19"),
  //filler
  make_picture_description_trial("naps",  "fill_catnap", "d20"),
  //filler
  make_picture_selection_trial("The carpenter builds furniture.", "fill_carpenter", "d21"),
  //critical
  make_picture_description_trial("gave",  "crit_man", "d22"),
  //filler
  make_picture_selection_trial("The crowded subway car.", "fill_subway", "d23"),
  //filler
  make_picture_description_trial("rests",  "fill_adult", "d24"),
  //filler
  make_picture_selection_trial("The barista serves coffee.", "fill_barista", "d25"),
  //filler
  make_picture_description_trial("rustic",  "fill_barn", "d26"),
  //critical
  make_picture_selection_trial("The student loaned the girl the pen.", "crit_pen", "d27"),
  //filler
  make_picture_description_trial("empty",  "fill_parkinglot", "d28"),
  //filler
  make_picture_selection_trial("The children play.", "fill_children", "d29"),
  //critical
  make_picture_description_trial("loaned",  "crit_local", "d30"),
  //filler
  make_picture_selection_trial("The elegant ballroom.", "fill_ballroom", "d31"),
  //filler
  make_picture_description_trial("takes",  "fill_waitress", "d32"),
  //filler
  make_picture_selection_trial("The mechanic fixes cars.", "fill_mechanic", "d33"),
  //filler
  make_picture_description_trial("remote",  "fill_trainstation", "d34"),
  //critical
  make_picture_selection_trial("The traveler sent the postcard to her family back home.", "crit_travelercard", "d35"),
  //filler
  make_picture_description_trial("sculpts",  "fill_artist", "d36"),
  //filler
  make_picture_selection_trial("The busy airport terminal.", "fill_airport", "d37"),
  //critical
  make_picture_description_trial("sent",  "crit_boy", "d38"),
  //filler
  make_picture_selection_trial("A gentle breeze.", "fill_breeze", "d39"),
  //filler
  make_picture_description_trial("quiet",  "fill_village", "d40"),
  //filler
  make_picture_selection_trial("A man walks into the forest.", "fill_man", "d41"),
  //filler
  make_picture_description_trial("sits",  "fill_granny", "d42"),
  //critical
  make_picture_selection_trial("The mother gave the baby the toy.", "crit_mother", "d43"),
  //filler
  make_picture_description_trial("powerful",  "fill_storm", "d44"),
  //filler
  make_picture_selection_trial("The executive enters the skyscraper.", "fill_executive", "d45"),
  //critical
  make_picture_description_trial("gave",  "crit_airhostess", "d46"),
  //filler
  make_picture_selection_trial("The bustling market square.", "fill_marketsquare", "d47"),
  //filler
  make_picture_description_trial("stands",  "fill_girl", "d48"),
  //filler
  make_picture_selection_trial("The talented musician.", "fill_musician", "d49"),
  //filler
  make_picture_description_trial("aspiring",  "fill_aspiringartist", "d50"),
  //critical
  make_picture_selection_trial("The enthusiastic child showed the drawing to the friend.", "crit_child", "d51"),
  //filler
  make_picture_description_trial("serene",  "fill_lake", "d52"),
  //filler
  make_picture_selection_trial("The chef cooks a meal.", "fill_chef", "d53"),
  //critical
  make_picture_description_trial("showed",  "crit_barista", "d54"),
  //filler
  make_picture_selection_trial("A gardener plants flowers.", "fill_gardener", "d55"),
  //filler
  make_picture_description_trial("attempts",  "fill_baker", "d56"),
  //filler
  make_picture_selection_trial("The winding river.", "fill_river", "d57"),
  //filler
  make_picture_description_trial("captures",  "fill_photographer", "d58"),
  //critical
  make_picture_selection_trial("The grandmother handed the girl the present.", "crit_grandma", "d59"),
  //filler
  make_picture_description_trial("practices",  "fill_musicianpractices", "d60"),
  //filler
  make_picture_selection_trial("The worker focuses.", "fill_worker", "d61"),
  //critical
  make_picture_description_trial("handed",  "crit_trophy", "d62"),
  //filler
  make_picture_selection_trial("The athlete trains for hours.", "fill_athlete", "d63"),
  //filler
  make_picture_description_trial("daydreams",  "fill_mansat", "d64"),
  //filler
  make_picture_selection_trial("The fragrant rose garden.", "fill_garden", "d65"),
  //filler
  make_picture_description_trial("sips",  "fill_customer", "d66"),
  //critical
  make_picture_selection_trial("The woman loaned the bike to the neighbour.", "crit_woman", "d67"),
  //filler
  make_picture_description_trial("exotic",  "fill_plant", "d68"),
  //filler
  make_picture_selection_trial("The state-of-the-art laboratory.", "fill_lab", "d69"),
  //critical
  make_picture_description_trial("loaned",  "crit_librarian", "d70"),
  //filler
  make_picture_selection_trial("The firefighter carries a kitten.", "fill_firefighter", "d71"),
  //filler
  make_picture_description_trial("old-fashioned",  "fill_workshop", "d72"),
  //filler
  make_picture_selection_trial("The majestic mountain range.", "fill_mountain", "d73"),
  //filler
  make_picture_description_trial("reviews",  "fill_accountant", "d74"),
  //critical
  make_picture_selection_trial("The architect handed the engineer the plans.", "crit_architect", "d75"),
  //filler
  make_picture_description_trial("flat",  "fill_desert", "d76"),
  //filler
  make_picture_selection_trial("The delicious aroma of freshly baked bread.", "fill_bread", "d77"),
  //critical
  make_picture_description_trial("handed",  "crit_teacher", "d78"),
  //filler
  make_picture_selection_trial("The secretary organises files.", "fill_secretary", "d79"),
  //filler
  make_picture_description_trial("mouth watering",  "fill_dessert", "d80"),
 
 
 ];

/******************************************************************************/
/*** Preload ******************************************************************/
/******************************************************************************/

/*
Once all the other trials have been created, images_to_preload should contain a list
of image names, we can simply loop through this
list, adding the path and file extension to each image name, and use the resulting 
list of images in our preload trial.
*/

var images_to_preload_with_path = [];
for (var image of images_to_preload) {
  var full_image_name = "images/" + image + ".png";
  images_to_preload_with_path.push(full_image_name);
}

/*
Now we can make our preload trial
*/
var preload = {
  type: jsPsychPreload,
  auto_preload: true,
  images: images_to_preload_with_path,
};

/******************************************************************************/
/*** Write headers for data file **********************************************/
/******************************************************************************/

/*
Same as the perceptual learning practical.
*/
var write_headers = {
  type: jsPsychCallFunction,
  func: function () {
    var this_participant_filename = "hmcondition_" + participant_id + ".csv";
    save_data(
      this_participant_filename,
      "participant_id,trial_index,participant_task,time_elapsed,sound_file,target_image,foil_image,button_choice0,button_choice1,response,button_selected,rt\n"
    );
  },
};


/******************************************************************************/
/*** Instruction trials *******************************************************/
/******************************************************************************/

/*
As usual, your experiment will need some instruction screens.
*/
/*
var consent_screen = {
  type: jsPsychHtmlButtonResponse,
  stimulus:
    "<div style='margin: 0 auto; max-width: 800px;'>\
    <h3>Welcome to the experiment</h3> \
  <p style='text-align:left'>You are invited to participate in a research experiment being conducted by Nina Bechis as part of her Dissertation research.\
  The purpose of this experiment is to gain insight into how well you work with an AI partner. Your participation in this study is entirely voluntary. \
  You may choose to withdraw at any time. If you choose to withdraw, your data will not be used in the study.</p> \
  <p style='text-align:left'>By clicking below, you consent to participate in this experiment. \
  Please <a href='InfoConsent.pdf' target='_blank' style='color: #FFFF00; text-decoration: underline;'>click here</a> for more information on how your data might be used and your rights as a particpant.</p>\
  </div>",
  choices: ["Yes, I consent to participate"],
};
*/

var consent_screen = {
  type: jsPsychHtmlButtonResponse,
  stimulus:
    "<div style='margin: 0 auto; max-width: 800px;'>\
    <h3>Welcome to the experiment</h3> \
  <p style='text-align:left'>Thank you for choosing to take part in our study! The session should take 15-20 minutes to complete.\
  Please ensure you are running the experiment on Google Chrome for the best experience.\
  This experiment is part of a research project conducted by Nina Bechis and Prof. Kenny Smith at The University of Edinburgh, \
  and has been approved by the Linguistics and English Language Ethics Committee. </p>\
  <p style='text-align:left'>Please <a href='InfoConsent.pdf' target='_blank' style='color: #FFFF00; text-decoration: underline;'>click here</a>\
   to download a study information letter (pdf) that provides further information about the study.</p>\
  <p style='text-align:left'>Clicking on the consent button below indicates that:</p>\
  <p style='text-align:left'>- You have downloaded and read the information letter</p>\
 <p style='text-align:left'> - You voluntarily agree to participate.</p>\
  </div>",
  choices: ["Yes, I consent to participate"],
};

var pre_interaction_instructions = {
  type: jsPsychHtmlButtonResponse,
  stimulus:
  "<div style='margin: 0 auto; max-width: 800px;'>\
    <h3>Instructions</h3>\
  <p style='text-align:left'>\
  <p style='text-align:left'>This is an interactive partner-based task. During the experiment, you will alternate between describing pictures \
  to your partner and matching pictures your partner describes to you.</p>\
  <p style='text-align:left'>When it is your turn to describe, you will see two pictures, one of which \
  will be highlighted with a green box. You should <u>describe the picture highlighted in the green box</u> to \
  your partner <u>using the given word.</u> \
  Remember that your partner sees the same two pictures, but they may not be in the same positions \
  (left/right).</p>\
  <p style='text-align:left'>When it is your turn to match, simply click on the picture your partner \
  describes to you.</p>\
  </div>",
  choices: ["Continue"],
};

var thoughts_on_partner = {
  type: jsPsychSurveyHtmlForm,
  preamble: '<p>Congratulations! You have reached the end of the experiment. Do you have any thoughts on the performance of your partner?</p>',
  html: '<p><input type="text" id="test-resp-box" name="response" size="30" required /></p>', // Add required here
  autofocus: 'test-resp-box',
  on_finish: function(data) {
    // Capture the text response from the survey
    var textResponse = data.response.response;  // This is where the text input is stored
    
    // Add the text response to the trial data
    data.textresponse = textResponse;
    
    // Add any missing fields to ensure they are available for saving
    data.participant_task = "thoughts_on_partner";  // Label this trial as "thoughts_on_partner"
    data.target = "NA";  // No target image for this trial
    data.foil = "NA";    // No foil image for this trial
    data.choices = "NA"; // No choices for this trial
    data.button_selected = "NA"; // No button selection for this trial

    // Call the existing save function to store the data
    save_confederate_priming_data(data);  // Save the trial data, including the text response
},
};

var final_screen = {
  type: jsPsychHtmlButtonResponse,
  stimulus:
    "<h3>Finished!</h3>\
  <p style='text-align:left'>Thank you for participating!</p>\
  <p style='text-align:left'>Click Continue to finish the experiment and see your raw data. \
  Your data was also saved to the server trial by trial.</p>",
  choices: ["Continue"],
};

/******************************************************************************/
/*** Saving data trial by trial ***********************************************/
/******************************************************************************/

/*
This is a slightly modification to Alisdair's save_data_line code. Note that data is
save to a file named cp_ID.csv, where cp stands for confederate priming and ID is
the randomly-generated participant ID.

We have to check which trial type we are selecting data for, since picture_description 
trials lack a button_selected entry. There's also no point 
saving the data.response info for picture_description trials, since it just indicates 
the participant clicking on the mic button, so we will save "NA" for those missing values.

*/

function save_confederate_priming_data(data) {
  // choose the data we want to save - this will also determine the order of the columns
  if (data.participant_task == "picture_selection") {
    var data_to_save = [
      participant_id,
      data.trial_index,
      data.participant_task,
      data.time_elapsed,
      data.stimulus,
      "NA",
      "NA", //'missing' target and foil image
      data.choices,
      data.response,
      data.button_selected,
      data.rt,
    ];
  } else if (data.participant_task == "picture_description") {
    var data_to_save = [
      participant_id,
      data.trial_index,
      data.participant_task,
      data.time_elapsed,
      "NA", //'missing' sound file
      data.target,
      data.foil,
      "NA",
      "NA", //'missing' choices for description trials
      "NA", //'missing' data.response
      "NA", //'missing' button_selected
      data.textresponse,
      data.rt,
    ];
  } else if (data.participant_task == "thoughts_on_partner") {
    // Handle the "thoughts_on_partner" trial separately
    data_to_save = [
        participant_id,
        data.trial_index,
        data.participant_task,
        data.time_elapsed,
        "NA", // No stimulus for this trial
        "NA", // No images for this trial
        "NA", 
        "NA", 
        "NA", 
        "NA", 
        "NA", 
        data.textresponse,  // Save the text response here
        data.rt
    ];
}
  // join these with commas and add a newline
  var line = data_to_save.join(",") + "\n";
  var this_participant_filename = "hmcondition_" + participant_id + ".csv";
  save_data(this_participant_filename, line);
}



/******************************************************************************/
/*** Build the full timeline *******************************************************/
/******************************************************************************/

var full_timeline = [].concat(
  consent_screen,
  preload,
  write_headers,
  pre_interaction_instructions,
  waiting_room,
  interaction_trials,
  thoughts_on_partner,
  final_screen
);

/******************************************************************************/
/*** Run the timeline *******************************************************/
/******************************************************************************/

jsPsych.run(full_timeline);