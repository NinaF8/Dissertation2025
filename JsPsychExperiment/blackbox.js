/*
The usual code for saving csv-type data (save_data)
*/

// helps save_data to try again if data saving fails
async function fetch_with_retry(...args) {
    let count = 0;
    while(count < 3) {
        try {
        let response = await fetch(...args);
        if (response.status !== 200) {
            throw new Error("Didn't get 200 Success");
        }
        return response;
        } catch(error) {
        console.log(error);
        }
        count++;
        await new Promise(x => setTimeout(x, 250));
    }
    throw new Error("Too many retries");
}

// save some data (as text) to the filename given
async function save_data(name, data_in){
    var url = 'save_data.php';
    var data_to_send = {filename: name, filedata: data_in};
    await fetch_with_retry(url, {
        method: 'POST',
        body: JSON.stringify(data_to_send),
        headers: new Headers({
                'Content-Type': 'application/json'
        })
    });
}
/*
For confederate_priming_readfromcsv.js we also need some code to fetch 
a CSV file from confederate_priming/trial_lists/ and convert the contents of 
that file to a javascript array, which can then be used to build a trial list. 
To do this we use Papa parse (https://www.papaparse.com), a javascript library 
that does all the fiddly stuff for us. Note that confederate_priiming_readfromcsv.html 
includes an extra line
<script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>
which loads this library from a CDN, in the same way that we load the plugin code.
*/

async function read_trial_list(triallist_filename) {
    var full_filename = "trial_lists/" + triallist_filename;
    var p = new Promise((resolve, reject) => {
      Papa.parse(full_filename, {
        header: true,
        download: true,
        complete: function (r) {
          resolve(r);
        },
        error (err) {
          reject(err);
        }
      })
    })
    var result = await p;
    return result.data;
  }
  
  