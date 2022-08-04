---
author: "Anfernee Jervis"
title: "'Sane'itizing MTA's Turnstile Datasets: Geotagging"
date: "2020-06-16"
tags: ["MTA Turnstile Dataset Series", "Geotagging", "MTA", "Datasets", "Data Mining", "Web Scraping", "Pandas"]

---

**Update:** [Looks like others have geotagged the turnstile dataset too.](https://github.com/chriswhong/nycturnstiles/blob/master/geocoded.csv) 

#### A Backstory 
in early 2019, I conducted research at BMCC on a noise pollution platform detailing the estimated noise pollution of neighborhoods in NYC ([full paper on the platform here if you're interested](https://www.microsoft.com/en-us/research/publication/diagnosing-new-york-citys-noises-with-ubiquitous-data/)). Essentially, the platform inferred the level and type of noise in an area from public ubiquitous datasets using machine learning. After familiarizing myself with the paper, I hypothesized a corelation with noise levels and the number of people within an area at any given time. As you would have guessed, it's not easy to know the exact number of people in a neighborhood at a given time, but given that [more than half of NYC uses public transportation](https://nytransit.org/resources/public-transit-facts), rideship data from the MTA would be helpful for testing my hypothesis. Dealing with the MTA dataset was not fun though.

#### The Turnstile Dataset
The MTA turnstile dataset is a great asset for many analysis projects (see [this](https://medium.com/@junyoung_lee/analysis-of-new-york-mta-turnstile-data-95251e212206) for example), but with a few issues; limited information on column definitions (I googled control area and saw something about airspace??), cumulative data counting backwards unexpectly, weird looking outliers and all sorts of strangeness. Unfortunately, I wasted a lot of time trying to make this dataset somewhat useful (and turns out [I'm not](https://medium.com/qri-io/taming-the-mtas-unruly-turnstile-data-c945f5f96ba0) the [only one](https://piratefsh.github.io/projects/2015/10/03/mta-subway-turnstile-data.html)). Of course I tried googling but, [you know, scarcity and what not]({{< relref "posts/scarcity-in-an-ocean-of-knowledge" >}}). Anyways, in an attempt to save the next gal/guy from burning hours away trying to tag the station location onto the MTA turnstile dataset, I'm sharing this NAAS or *notebook-as-a-sitepost*. Haha, okay I promise I'll be less cheeky for the rest of the post.  
  
I also would like to experiment creating a pipeline API for processing MTA datasets using some sort of app hosting platform with a free, limited option(like Heroku), to kind of test ways of optimizing for limited resources. A bit like what game developers did with 8 and 16 Bit hardware, but that's for another time.


#### Introducing the Dataset
The turnstile dataset is available for public use at http://web.mta.info/developers/turnstile.html. Each dataset contains a week's worth of aggrigated, 4 hour snapshots of the state of a counter within the station turnstiles. Lets briefly look at it:


```python
import pandas  # Good ol' pandas
import numpy as np
import urllib.request
from parsel import Selector  # Scrapy's parsel makes it easy to select html elements from a web document (https://github.com/scrapy/parsel)



# So, this function maps the date of the dataset to the dataset location. 
# Its not exactly necessary here, but I'm reusing code I already have so bear with me
def get_available_datasets():
    """
    fetches links to available datasets from MTA turnstile website.
    returns a dict of  date: url pairs.
    date format example: Saturday, April 11, 2020
    """

    MTA_URL = 'http://web.mta.info/developers/turnstile.html'
    DATA_URL_IDENTIFIER = 'data/nyct/turnstile/turnstile_'
    MTA_DOMAIN = 'http://web.mta.info/developers/'

    with urllib.request.urlopen(MTA_URL) as response:
      home_page = Selector(response.read().decode("utf8"))

    links = home_page.xpath('//a[contains(@href, "{}")]'.format(DATA_URL_IDENTIFIER))
    return {link.xpath('text()').get(): MTA_DOMAIN + link.xpath('@href').get() for link in links}

  
# Okay, let's pull a dataset and create a dataframe. We'll use last week's data (Saturday, June 13, 2020)

url = get_available_datasets()['Saturday, June 13, 2020']  # Ideally, what's returned from this function should be cached, but it'll run once so ¯\_(ツ)_/¯

with urllib.request.urlopen(url) as response:
  df = pandas.read_csv(response)

df.head(5)
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>C/A</th>
      <th>UNIT</th>
      <th>SCP</th>
      <th>STATION</th>
      <th>LINENAME</th>
      <th>DIVISION</th>
      <th>DATE</th>
      <th>TIME</th>
      <th>DESC</th>
      <th>ENTRIES</th>
      <th>EXITS</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>00:00:00</td>
      <td>REGULAR</td>
      <td>7420920</td>
      <td>2521129</td>
    </tr>
    <tr>
      <th>1</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>04:00:00</td>
      <td>REGULAR</td>
      <td>7420920</td>
      <td>2521130</td>
    </tr>
    <tr>
      <th>2</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>08:00:00</td>
      <td>REGULAR</td>
      <td>7420928</td>
      <td>2521141</td>
    </tr>
    <tr>
      <th>3</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>12:00:00</td>
      <td>REGULAR</td>
      <td>7420941</td>
      <td>2521163</td>
    </tr>
    <tr>
      <th>4</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>16:00:00</td>
      <td>REGULAR</td>
      <td>7420972</td>
      <td>2521174</td>
    </tr>
  </tbody>
</table>
</div>



  
  
Not bad right? Besides the columns that aren't immediately obvious (C/A, SCP, etc) we can see that the first 4 rows are counts from the 59th ST station. Wait, which station? There's multiple stations at 59 ST in Manhattan.  
  
Well if we look at the stops at that station (represented by the LINENAME column), we can guess that it must be the Lexington Avenue/59th Street station. You can also confirm this by looking for all the stations with 59 ST in the names. You'll see that the one for Columbus Circle says "Columbus" in its name:


```python
# Computer, I command you to give me all the Station names with "59 ST" in them
df[df["STATION"].str.contains("59 ST")]["STATION"].unique()
```




    array(['59 ST', '5 AV/59 ST', '59 ST COLUMBUS'], dtype=object)



  
It would've been nice if it was geotagged though, right?  
  
Yeah?  
  
We'll, lets tag it then.  
  
There's a dataset with latitude/longitude pairs for stations from MTA that we can use to geotag our turnstile datasets. The dataset can be downloaded [here](http://web.mta.info/developers/data/nyct/subway/Stations.csv). Unfortunately, the dataset isn't consistent with the turnstile dataset, and we cannot simply join the two datasets on, say, the name of the station. So we need to seek alternative measures.  
  
The easiest solution I could think of was fuzzy string matching on station names, along with a bit of manual pairing. Using this method, I was able to match most of the stations listed in the turnstile dataset with a corresponding latitude/longitude coordinates. It wasn't easy though and did take a considerable amount of hours.  
  
For explanation sake, I'll briefly take you through that journey. Don't worry, I'll try to make it bearable.  
  
First, lets get the station location dataset I mentioned earlier and take a look:


```python
with urllib.request.urlopen("http://web.mta.info/developers/data/nyct/subway/Stations.csv") as response:
  stationsdf = pandas.read_csv(response)

stationsdf.head(5)
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Station ID</th>
      <th>Complex ID</th>
      <th>GTFS Stop ID</th>
      <th>Division</th>
      <th>Line</th>
      <th>Stop Name</th>
      <th>Borough</th>
      <th>Daytime Routes</th>
      <th>Structure</th>
      <th>GTFS Latitude</th>
      <th>GTFS Longitude</th>
      <th>North Direction Label</th>
      <th>South Direction Label</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>1</td>
      <td>1</td>
      <td>R01</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Astoria - Ditmars Blvd</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.775036</td>
      <td>-73.912034</td>
      <td>NaN</td>
      <td>Manhattan</td>
    </tr>
    <tr>
      <th>1</th>
      <td>2</td>
      <td>2</td>
      <td>R03</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Astoria Blvd</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.770258</td>
      <td>-73.917843</td>
      <td>Ditmars Blvd</td>
      <td>Manhattan</td>
    </tr>
    <tr>
      <th>2</th>
      <td>3</td>
      <td>3</td>
      <td>R04</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>30 Av</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.766779</td>
      <td>-73.921479</td>
      <td>Astoria - Ditmars Blvd</td>
      <td>Manhattan</td>
    </tr>
    <tr>
      <th>3</th>
      <td>4</td>
      <td>4</td>
      <td>R05</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Broadway</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.761820</td>
      <td>-73.925508</td>
      <td>Astoria - Ditmars Blvd</td>
      <td>Manhattan</td>
    </tr>
    <tr>
      <th>4</th>
      <td>5</td>
      <td>5</td>
      <td>R06</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>36 Av</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.756804</td>
      <td>-73.929575</td>
      <td>Astoria - Ditmars Blvd</td>
      <td>Manhattan</td>
    </tr>
  </tbody>
</table>
</div>



  
  
Great, now we have quite a bit of location data for each station. Let's see what shows up when we search for "59 st" in the stop name. That'll give us an idea of the possibility of joining on stop name/STATION columns:


```python
# Computer, I am once again asking you to give me all the Station names with "59 St" in them
stationsdf[stationsdf["Stop Name"].str.contains("59 St")]
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Station ID</th>
      <th>Complex ID</th>
      <th>GTFS Stop ID</th>
      <th>Division</th>
      <th>Line</th>
      <th>Stop Name</th>
      <th>Borough</th>
      <th>Daytime Routes</th>
      <th>Structure</th>
      <th>GTFS Latitude</th>
      <th>GTFS Longitude</th>
      <th>North Direction Label</th>
      <th>South Direction Label</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>6</th>
      <td>7</td>
      <td>613</td>
      <td>R11</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Lexington Av/59 St</td>
      <td>M</td>
      <td>N W R</td>
      <td>Subway</td>
      <td>40.762660</td>
      <td>-73.967258</td>
      <td>Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>7</th>
      <td>8</td>
      <td>8</td>
      <td>R13</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>5 Av/59 St</td>
      <td>M</td>
      <td>N W R</td>
      <td>Subway</td>
      <td>40.764811</td>
      <td>-73.973347</td>
      <td>Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>34</th>
      <td>35</td>
      <td>35</td>
      <td>R41</td>
      <td>BMT</td>
      <td>4th Av</td>
      <td>59 St</td>
      <td>Bk</td>
      <td>N R</td>
      <td>Subway</td>
      <td>40.641362</td>
      <td>-74.017881</td>
      <td>Manhattan</td>
      <td>Coney Island - Bay Ridge</td>
    </tr>
    <tr>
      <th>160</th>
      <td>161</td>
      <td>614</td>
      <td>A24</td>
      <td>IND</td>
      <td>8th Av - Fulton St</td>
      <td>59 St - Columbus Circle</td>
      <td>M</td>
      <td>A B C D</td>
      <td>Subway</td>
      <td>40.768296</td>
      <td>-73.981736</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>315</th>
      <td>315</td>
      <td>614</td>
      <td>125</td>
      <td>IRT</td>
      <td>Broadway - 7Av</td>
      <td>59 St - Columbus Circle</td>
      <td>M</td>
      <td>1</td>
      <td>Subway</td>
      <td>40.768247</td>
      <td>-73.981929</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown</td>
    </tr>
    <tr>
      <th>400</th>
      <td>400</td>
      <td>613</td>
      <td>629</td>
      <td>IRT</td>
      <td>Lexington Av</td>
      <td>59 St</td>
      <td>M</td>
      <td>4 5 6</td>
      <td>Subway</td>
      <td>40.762526</td>
      <td>-73.967967</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
  </tbody>
</table>
</div>



  
  
Yikes. Okay. So a couple of issues here (funny thing is, I haven't noticed these issues until I started writing this. Datascience ami right?) The first one is that the names in our location dataset aren't the station names; they're actually the names of the *stops*. I totally missed that earlier, but fortunately, they line up enough for a lot of the names in the "STATION" column of our turnstile dataset. We can still use this dataset, but we'll have to do more than just join on "STATION" and "Stop Name".  
  
Okay, lets examine our station/stop locations dataset first. From our example above, we can see that some stations are broken down into multiple stops, with differing line and routes (for example, the first and last rows). What you should also notice is that the complex id is the same for both rows. Coincidence? Well, lets find out: (You'd think the station ID would be the same, but nooope. I tried searching for a key for the column names, but found nothing *sigh*.)


```python
# What this one liner does is group the rows by "Complex ID", filter the groups that have more than one row, 
# and sort them so we can see the groups next to each other. 
stationsdf.groupby('Complex ID').filter(lambda g: len(g) > 1).sort_values("Complex ID", ascending=False)
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Station ID</th>
      <th>Complex ID</th>
      <th>GTFS Stop ID</th>
      <th>Division</th>
      <th>Line</th>
      <th>Stop Name</th>
      <th>Borough</th>
      <th>Daytime Routes</th>
      <th>Structure</th>
      <th>GTFS Latitude</th>
      <th>GTFS Longitude</th>
      <th>North Direction Label</th>
      <th>South Direction Label</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>174</th>
      <td>174</td>
      <td>636</td>
      <td>A41</td>
      <td>IND</td>
      <td>8th Av - Fulton St</td>
      <td>Jay St - MetroTech</td>
      <td>Bk</td>
      <td>A C F</td>
      <td>Subway</td>
      <td>40.692338</td>
      <td>-73.987342</td>
      <td>Manhattan</td>
      <td>Euclid - Lefferts - Rockaways - Coney Island</td>
    </tr>
    <tr>
      <th>24</th>
      <td>25</td>
      <td>636</td>
      <td>R29</td>
      <td>BMT</td>
      <td>Broadway</td>
      <td>Jay St - MetroTech</td>
      <td>Bk</td>
      <td>R</td>
      <td>Subway</td>
      <td>40.692180</td>
      <td>-73.985942</td>
      <td>Manhattan</td>
      <td>Bay Ridge - 95 St</td>
    </tr>
    <tr>
      <th>330</th>
      <td>330</td>
      <td>635</td>
      <td>142</td>
      <td>IRT</td>
      <td>Broadway - 7Av</td>
      <td>South Ferry</td>
      <td>M</td>
      <td>1</td>
      <td>Subway</td>
      <td>40.702068</td>
      <td>-74.013664</td>
      <td>Uptown &amp; The Bronx</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>22</th>
      <td>23</td>
      <td>635</td>
      <td>R27</td>
      <td>BMT</td>
      <td>Broadway</td>
      <td>Whitehall St</td>
      <td>M</td>
      <td>R W</td>
      <td>Subway</td>
      <td>40.703087</td>
      <td>-74.012994</td>
      <td>Uptown &amp; Queens</td>
      <td>Brooklyn</td>
    </tr>
    <tr>
      <th>127</th>
      <td>128</td>
      <td>630</td>
      <td>L17</td>
      <td>BMT</td>
      <td>Canarsie</td>
      <td>Myrtle - Wyckoff Avs</td>
      <td>Bk</td>
      <td>L</td>
      <td>Subway</td>
      <td>40.699814</td>
      <td>-73.911586</td>
      <td>Manhattan</td>
      <td>Canarsie - Rockaway Parkway</td>
    </tr>
    <tr>
      <th>...</th>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
    </tr>
    <tr>
      <th>462</th>
      <td>461</td>
      <td>461</td>
      <td>R09</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Queensboro Plaza</td>
      <td>Q</td>
      <td>N W</td>
      <td>Elevated</td>
      <td>40.750582</td>
      <td>-73.940202</td>
      <td>Astoria - Flushing</td>
      <td>Manhattan</td>
    </tr>
    <tr>
      <th>166</th>
      <td>167</td>
      <td>167</td>
      <td>A32</td>
      <td>IND</td>
      <td>8th Av - Fulton St</td>
      <td>W 4 St</td>
      <td>M</td>
      <td>A C E</td>
      <td>Subway</td>
      <td>40.732338</td>
      <td>-74.000495</td>
      <td>Uptown - Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>167</th>
      <td>167</td>
      <td>167</td>
      <td>D20</td>
      <td>IND</td>
      <td>6th Av - Culver</td>
      <td>W 4 St</td>
      <td>M</td>
      <td>B D F M</td>
      <td>Subway</td>
      <td>40.732338</td>
      <td>-74.000495</td>
      <td>Uptown - Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>149</th>
      <td>151</td>
      <td>151</td>
      <td>A12</td>
      <td>IND</td>
      <td>8th Av - Fulton St</td>
      <td>145 St</td>
      <td>M</td>
      <td>A C</td>
      <td>Subway</td>
      <td>40.824783</td>
      <td>-73.944216</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>150</th>
      <td>151</td>
      <td>151</td>
      <td>D13</td>
      <td>IND</td>
      <td>Concourse</td>
      <td>145 St</td>
      <td>M</td>
      <td>B D</td>
      <td>Subway</td>
      <td>40.824783</td>
      <td>-73.944216</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
  </tbody>
</table>
<p>86 rows × 13 columns</p>
</div>



  
  
Okay. Lets take some samples and test. We've already seen for Lexington Av/59th St that the "Daytime Routes" (AKA trains that run there) mostly add up to the "LINENAME" in our turnstile dataset (except for the Q train, which I assume is there because of the access to the Lexington Av/63rd St Station, which runs the Q train. There also was a substitution of the Q for the W from 2010-2016. [details here if you're interested](https://en.wikipedia.org/wiki/Lexington_Avenue/59th_Street_station)). Let's try rows 3 & 4; Whitehall St and South Ferry. If you add the "Daytime Routes", you'll see it corresponds with the "LINENAME" values for "SOUTH FERRY" in the turnstile dataset: 



```python
df[df["STATION"] == "SOUTH FERRY"].head(1) 
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>C/A</th>
      <th>UNIT</th>
      <th>SCP</th>
      <th>STATION</th>
      <th>LINENAME</th>
      <th>DIVISION</th>
      <th>DATE</th>
      <th>TIME</th>
      <th>DESC</th>
      <th>ENTRIES</th>
      <th>EXITS</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>128358</th>
      <td>R101</td>
      <td>R001</td>
      <td>02-00-00</td>
      <td>SOUTH FERRY</td>
      <td>1RW</td>
      <td>IRT</td>
      <td>06/06/2020</td>
      <td>01:00:00</td>
      <td>REGULAR</td>
      <td>7025506</td>
      <td>283662</td>
    </tr>
  </tbody>
</table>
</div>



  
  
Great. So maybe we can use the LINENAME/Daytime Routes to geotag the turnstile dataset.  
  
Lets try it.  
  
First, I'll try to consolidate the "Daytime Routes" for the stops stops that are in the same station, and replace the "Daytime Routes" for each with the consolidated value. Afterward, we'll check Lex av/59th and South Ferry/Whitehall:


```python
# this needs to run ONLY ONCE or you'll get the world of duplicates
stationsdf["Daytime Routes"] = stationsdf[["Complex ID","Daytime Routes"]].groupby("Complex ID")["Daytime Routes"].transform(lambda x: ''.join([y.replace(' ', '') for y in x]))
```


```python
# Check Lex av/59th
stationsdf[stationsdf["Stop Name"].str.contains("59 St")]
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Station ID</th>
      <th>Complex ID</th>
      <th>GTFS Stop ID</th>
      <th>Division</th>
      <th>Line</th>
      <th>Stop Name</th>
      <th>Borough</th>
      <th>Daytime Routes</th>
      <th>Structure</th>
      <th>GTFS Latitude</th>
      <th>GTFS Longitude</th>
      <th>North Direction Label</th>
      <th>South Direction Label</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>6</th>
      <td>7</td>
      <td>613</td>
      <td>R11</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>Lexington Av/59 St</td>
      <td>M</td>
      <td>NWR456</td>
      <td>Subway</td>
      <td>40.762660</td>
      <td>-73.967258</td>
      <td>Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>7</th>
      <td>8</td>
      <td>8</td>
      <td>R13</td>
      <td>BMT</td>
      <td>Astoria</td>
      <td>5 Av/59 St</td>
      <td>M</td>
      <td>NWR</td>
      <td>Subway</td>
      <td>40.764811</td>
      <td>-73.973347</td>
      <td>Queens</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>34</th>
      <td>35</td>
      <td>35</td>
      <td>R41</td>
      <td>BMT</td>
      <td>4th Av</td>
      <td>59 St</td>
      <td>Bk</td>
      <td>NR</td>
      <td>Subway</td>
      <td>40.641362</td>
      <td>-74.017881</td>
      <td>Manhattan</td>
      <td>Coney Island - Bay Ridge</td>
    </tr>
    <tr>
      <th>160</th>
      <td>161</td>
      <td>614</td>
      <td>A24</td>
      <td>IND</td>
      <td>8th Av - Fulton St</td>
      <td>59 St - Columbus Circle</td>
      <td>M</td>
      <td>ABCD1</td>
      <td>Subway</td>
      <td>40.768296</td>
      <td>-73.981736</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
    <tr>
      <th>315</th>
      <td>315</td>
      <td>614</td>
      <td>125</td>
      <td>IRT</td>
      <td>Broadway - 7Av</td>
      <td>59 St - Columbus Circle</td>
      <td>M</td>
      <td>ABCD1</td>
      <td>Subway</td>
      <td>40.768247</td>
      <td>-73.981929</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown</td>
    </tr>
    <tr>
      <th>400</th>
      <td>400</td>
      <td>613</td>
      <td>629</td>
      <td>IRT</td>
      <td>Lexington Av</td>
      <td>59 St</td>
      <td>M</td>
      <td>NWR456</td>
      <td>Subway</td>
      <td>40.762526</td>
      <td>-73.967967</td>
      <td>Uptown &amp; The Bronx</td>
      <td>Downtown &amp; Brooklyn</td>
    </tr>
  </tbody>
</table>
</div>



  
  
Great. Now let's see if we can get somewhere with this. We know we can't directly join because the stations don't have the exact names. The next best thing is to fuzzy search. We'll use fuzzywuzzy to do the fuzzy matching, so now we need a strategy to ensure our dataset is as accurate as possible.
   
The easiest strategy I can think of is to match the names first then match the Routes and assume the highest pair is correct (we'll test of course). With this in mind, I can match the closest name with routes that are essentially the same thing.  
  
Lets see how that plays out:


```python
from fuzzywuzzy import process, fuzz
from operator import itemgetter


station_stops = {x[0].replace(' ', '').replace('-', ''): x[0] for x in zip(stationsdf["Stop Name"])}

station_stop_names = station_stops.keys()

def match_records(row):
  """
  Receives a unique (STATION, LINENAME) row from the turnstile dataset and attempts to match it with a record
  from the stop/station location dataset using the names and Routes.
  
  The function runs fuzzy search on the station name and the linename/routes and aggregates the results.
  Then it sorts the results in descending order by the match ratio of the name first, then the linename/route.
  Finally, it returns the result with the highest name and line/route match ratio
  
  Returns a dictionary in the format 
    {'station': '59 ST',        == Corresponds to the STATION column in the turnstile dataset
   'name_match': ('59St', 100), == Corresponds to the matched stop name keys & the match ratio
   'line_match': 'NWR456',      == Corresponds to the lines/Routes 
   'stop_name_match': '59 St',  == Corresponds to the actual, unmodified stop name
   'line_fuzz_ratio': 77}       == Corresponds to the match ratio of the Routes with that of the LINENAME From the
                                   turnstile dataset 
  """
  
  # preprocess the station name to increase the accuracy of fuzzy matching
  station_name = row["STATION"].replace(' ', '').replace('-', '')
  
  station_routes = row["LINENAME"]
  
  # first, get the potential matches. 
  candidates = process.extract(station_name, 
                               station_stop_names, scorer=fuzz.token_sort_ratio, limit=10)
  
  
  # stores the results of all the line matches for each name match 
  records = []
 
  for x in candidates:
    
    # Find corresponding record(s) from the station locations dataframe 
    candidate_match = stationsdf[stationsdf["Stop Name"] == station_stops[x[0]]]["Daytime Routes"].unique()
    
    for y in candidate_match:
      records.append({
        "station": row["STATION"],
        "name_match": x,
        "line_match": y,
        "station_line": station_routes,
        "stop_name_match": station_stops[x[0]],
        "line_fuzz_ratio": fuzz.token_sort_ratio(station_routes, y)
      })
  
  # sorts the results by name first, line/route second, in descending order, and returns the first result
  return sorted(records, key=lambda x: (x["name_match"][1], x["line_fuzz_ratio"]), reverse=True)[0]

```


```python
# Now we apply the function to our dataframes
results = df[['STATION','LINENAME']].drop_duplicates().reset_index().apply(match_records, axis=1)
```

  
  
Okay we're close! There are a couple of stations that aren't matching correctly, or don't exist in your locations dataset. We'll have to do some manual vetting to take care of those (don't worry, I did it myself.)  
  
Now, lets clean our data, fix the wrong matches, and use the mapping to geotag the turnstile dataset.


```python
# Here's a list of items that weren't a perfect match for both station names and routes *surpressed to the first 2* 
# We'll review these and remove the ones we cant fix, or update the mismatches
[x for x in results if x['line_fuzz_ratio'] < 100 and x["name_match"][1] < 100][:2]
```




    [{'station': 'WHITEHALL S-FRY',
      'name_match': ('WhitehallSt', 83),
      'line_match': 'RW1',
      'station_line': 'R1W',
      'stop_name_match': 'Whitehall St',
      'line_fuzz_ratio': 67},
     {'station': 'DELANCEY/ESSEX',
      'name_match': ('DelanceySt', 75),
      'line_match': 'JMZF',
      'station_line': 'FJMZ',
      'stop_name_match': 'Delancey St',
      'line_fuzz_ratio': 75}]




```python
# Fixed missed matches here:
# the patched key is there to identify records that were manually corrected
mismatches = {
 'FLATBUSH AV-B.C': {'station': 'FLATBUSH AV-B.C',
  'name_match': ('Flatbush Av - Brooklyn College', 61),
  'line_match': '25',
  'station_line': '25',
  'stop_name_match': 'Flatbush Av - Brooklyn College',
  'line_fuzz_ratio': 100,
  'patched': True},
  
  'ROCKAWAY PARK B': {'station': 'ROCKAWAY PARK B',
  'name_match': ('RockawayParkBeach116St', 100),
  'line_match': 'AS',
  'station_line': 'AS',
  'stop_name_match': 'Rockaway Park - Beach 116 St',
  'line_fuzz_ratio': 100,
  'patched': True},
# ... surpressed
}

  # The location of these aren't in the dataset, so we'll ignore them. 
  # I don't know what some of the names correspond to either 
unknowns = [
  "RIT-ROOSEVELT",
  "RIT-MANHATTAN",
  "ST. GEORGE",
  "ORCHARD BEACH",
  "NEWARK HW BMEBE",
  "HARRISON",
  "JOURNAL SQUARE",
  'EXCHANGE PLACE',
  'PAVONIA/NEWPORT',
  'CITY / BUS',
  # ... surpressed
]
```


```python
# Lets now filter the unknowns and fix the mismatches
results_filtered = [x for x in results if x['station'] not in unknowns]

# and also, fix the mismatches
results_fixed = [mismatches[x['station']] if mismatches.get(x['station'], None) is not None else x for x in results_filtered]
```

  
Alright, now its time to geotag each record. To do so, I'll map station names and routes to a particular location, then later use that to update the turnstile records


```python
# maps the station and line to the geolocations

_ = [
  x.update(
    stationsdf[
      (stationsdf["Stop Name"] == x["stop_name_match"]) & 
      (stationsdf["Daytime Routes"] == x["line_match"])
    ]
    [["GTFS Latitude", "GTFS Longitude"]].head(1).to_dict('list')
  ) for x in results_fixed]

# Some records have the lat/long values in a list (like [40.824073] for example). the lines below fixes that
_ = [
  x.update(
    {'GTFS Latitude': x['GTFS Latitude'][0] if type(x['GTFS Latitude']) is list else x, 
     'GTFS Longitude': x['GTFS Longitude'][0] if type(x['GTFS Longitude']) is list else x}
  ) for x in results_fixed]


# I'll convert it into a df, then use 'station' and 'station_line' to join it on the turnstile dataset
mappingdf = pandas.DataFrame(results_fixed).drop(['name_match', 'line_match', 'stop_name_match', 'line_fuzz_ratio', 'patched'], axis=1)
pandas.merge(df, mappingdf, left_on=['STATION', 'LINENAME'], right_on=['station', 'station_line'], how='left')

```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>C/A</th>
      <th>UNIT</th>
      <th>SCP</th>
      <th>STATION</th>
      <th>LINENAME</th>
      <th>DIVISION</th>
      <th>DATE</th>
      <th>TIME</th>
      <th>DESC</th>
      <th>ENTRIES</th>
      <th>EXITS</th>
      <th>station</th>
      <th>station_line</th>
      <th>GTFS Latitude</th>
      <th>GTFS Longitude</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>00:00:00</td>
      <td>REGULAR</td>
      <td>7420920</td>
      <td>2521129</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>40.762526</td>
      <td>-73.967967</td>
    </tr>
    <tr>
      <th>1</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>04:00:00</td>
      <td>REGULAR</td>
      <td>7420920</td>
      <td>2521130</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>40.762526</td>
      <td>-73.967967</td>
    </tr>
    <tr>
      <th>2</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>08:00:00</td>
      <td>REGULAR</td>
      <td>7420928</td>
      <td>2521141</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>40.762526</td>
      <td>-73.967967</td>
    </tr>
    <tr>
      <th>3</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>12:00:00</td>
      <td>REGULAR</td>
      <td>7420941</td>
      <td>2521163</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>40.762526</td>
      <td>-73.967967</td>
    </tr>
    <tr>
      <th>4</th>
      <td>A002</td>
      <td>R051</td>
      <td>02-00-00</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>BMT</td>
      <td>06/06/2020</td>
      <td>16:00:00</td>
      <td>REGULAR</td>
      <td>7420972</td>
      <td>2521174</td>
      <td>59 ST</td>
      <td>NQR456W</td>
      <td>40.762526</td>
      <td>-73.967967</td>
    </tr>
    <tr>
      <th>...</th>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
      <td>...</td>
    </tr>
    <tr>
      <th>206657</th>
      <td>TRAM2</td>
      <td>R469</td>
      <td>00-05-01</td>
      <td>RIT-ROOSEVELT</td>
      <td>R</td>
      <td>RIT</td>
      <td>06/12/2020</td>
      <td>05:00:00</td>
      <td>REGULAR</td>
      <td>5554</td>
      <td>514</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>206658</th>
      <td>TRAM2</td>
      <td>R469</td>
      <td>00-05-01</td>
      <td>RIT-ROOSEVELT</td>
      <td>R</td>
      <td>RIT</td>
      <td>06/12/2020</td>
      <td>09:00:00</td>
      <td>REGULAR</td>
      <td>5554</td>
      <td>514</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>206659</th>
      <td>TRAM2</td>
      <td>R469</td>
      <td>00-05-01</td>
      <td>RIT-ROOSEVELT</td>
      <td>R</td>
      <td>RIT</td>
      <td>06/12/2020</td>
      <td>13:00:00</td>
      <td>REGULAR</td>
      <td>5554</td>
      <td>514</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>206660</th>
      <td>TRAM2</td>
      <td>R469</td>
      <td>00-05-01</td>
      <td>RIT-ROOSEVELT</td>
      <td>R</td>
      <td>RIT</td>
      <td>06/12/2020</td>
      <td>17:00:00</td>
      <td>REGULAR</td>
      <td>5554</td>
      <td>514</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>206661</th>
      <td>TRAM2</td>
      <td>R469</td>
      <td>00-05-01</td>
      <td>RIT-ROOSEVELT</td>
      <td>R</td>
      <td>RIT</td>
      <td>06/12/2020</td>
      <td>21:00:00</td>
      <td>REGULAR</td>
      <td>5554</td>
      <td>514</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
  </tbody>
</table>
<p>206662 rows × 15 columns</p>
</div>



  
  
Done! We're all geotagged now!  
  
#### Imrovements and Contributions Welcomed! 
I'll have the code and dataset available [here](https://github.com/ajpen/MTA-Station-Geo-Location-Mapping). Feel free to open issues and PRs for fixes/improvements.  
  
That is all.
