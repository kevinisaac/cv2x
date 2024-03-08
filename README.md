# CV2X

CV2X

## Tech Stack

- Python3.11
- Node 18


## Steps to run the Backend

### Step 1

Clone this repo or make sure that you are working on the latest version of this repo.

### Step 2

Make sure that you have Python and PostgreSQL installed.
And that database is running in your system.

### Step 3

Add the developer specific configuration file (inside `backend/configs/`). To override anything defined in the `config.py` file, redefine it inside the `dev_config.py` file. (Check `dev_config_example.py`)

### Step 4

Go to root of the application, open a new terminal and create the virtual environment using,
type : `python3 -m venv venv_name`.

### Step 5

Activate the python virtual environment using,
type : `. venv_name/bin/activate`.

### Step 6

Update pip to latest version,
type : `pip install --upgrade pip`.

### Step 7

Install all the python packages from the requirement file like this,
type : `pip install -r requirements.txt`.

### Step 8

To seed (reset with initial data) the database,
type: `flask rebuild`.

### Step 9

Run the application by typing the command,
type : `python run.py`

## Frontend

## Directory Structure

1. frontend  - All code related javascript, CSS for the application
2. backend   - Code related to business logic, models, api and configs
3. static    - Files and code which can be served without authentication
4. templates - HTML templates including index.html, email templates etc
5. uploads   - Folder which stores all files uploaded in the application
6. logs      - All logs related to the application

