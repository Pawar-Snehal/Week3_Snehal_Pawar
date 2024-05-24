import { Router } from "express";
import axios from "axios";
import Weather from "../models/weather";
import nodemailer from "nodemailer";
import sequelize from "../models";
import { log } from "console";

const router = Router();

const GEO_API_URL = "https://api.api-ninjas.com/v1/geocoding";
const WEATHER_API_URL = "https://weatherapi-com.p.rapidapi.com/current.json";

const GEO_API_KEY = "j4RvH5d+rTdB47EJn3hbXA==HQrYQ7MGwqNkxzbY";
const WEATHER_API_KEY = "d9489a194emsh1c20593f9910257p1751dbjsn588906a26535";
const EMAIL_USER = "pawarsnehal5050@gmail.com";
const EMAIL_PASS = "onpj fixk mixw ucip";
const RECIPIENT_EMAIL = "pawarsnehal691@gmail.com";

interface City {
  city: string;
  country: string;
}

interface GeoResponse {
  latitude: number;
  longitude: number;
}

interface WeatherResponse {
  current: {
    condition: {
      text: string;
    };
  };
}

const fetchCoordinates = async (
  city: string,
  country: string
): Promise<GeoResponse> => {
  try {
    const response = await axios.get(GEO_API_URL, {
      params: { city, country },
      headers: { "X-Api-Key": GEO_API_KEY },
    });
    if (response.data.length === 0) {
      throw new Error(`No geocoding data found for city: ${city}`);
    }
    return response.data[0];
  } catch (error) {
    console.error(
      `Error fetching coordinates for ${city}: `,
      (error as Error).message
    );
    throw error;
  }
};

const fetchWeather = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await axios.get<WeatherResponse>(WEATHER_API_URL, {
      params: { q: `${latitude},${longitude}` },
      headers: {
        "X-RapidAPI-Key": WEATHER_API_KEY,
        "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
      },
    });
    console.log(response.data);
    return response.data.current.condition.text;
  } catch (error) {
    console.error(
      `Error fetching weather for coordinates (${latitude}, ${longitude}): `,
      (error as Error).message
    );
    throw error;
  }
};

router.post("/SaveWeatherMapping", async (req, res) => {
  const cities: City[] = req.body;

  try {
    const results = await Promise.all(
      cities.map(async (city) => {
        try {
          const { latitude, longitude } = await fetchCoordinates(
            city.city,
            city.country
          );
          const weather = await fetchWeather(latitude, longitude);

          const newWeather = await Weather.create({
            city: city.city,
            country: city.country,
            weather,
            time: new Date(),
            longitude,
            latitude,
          });

          return newWeather;
        } catch (error) {
          console.error(
            `Error processing city ${city.city}: `,
            (error as Error).message
          );
          throw error;
        }
      })
    );

    res.status(201).json(results);
  } catch (error) {
    console.error(
      "Error in SaveWeatherMapping API: ",
      (error as Error).message
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/weatherDashboard", async (req, res) => {
  const { city } = req.query;

  try {
    if (city) {
      const weatherData = await Weather.findAll({
        where: { city: city as string },
        order: [["time", "DESC"]],
      });
      res.json(weatherData);
    } else {
      const latestWeatherData = await Weather.findAll({
        attributes: [
          "city",
          [sequelize.fn("MAX", sequelize.col("time")), "latest"],
        ],
        group: ["city"],
        raw: true,
      });

      const weatherData = await Promise.all(
        latestWeatherData.map(async (data: any) => {
          return Weather.findOne({
            where: { city: data.city, time: data.latest },
          });
        })
      );

      res.json(weatherData);
    }
  } catch (error) {
    console.error("Error in weatherDashboard API: ", (error as Error).message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/sendWeatherReport", async (req, res) => {
  try {
    const weatherData = await Weather.findAll();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: EMAIL_USER,
      to: RECIPIENT_EMAIL,
      subject: "Weather Report",
      html: `<table border="1">
                <thead>
                  <tr>
                    <th>City</th>
                    <th>Country</th>
                    <th>Weather</th>
                    <th>Time</th>
                    <th>Longitude</th>
                    <th>Latitude</th>
                  </tr>
                </thead>
                <tbody>
                  ${weatherData
                    .map(
                      (data) => `
                    <tr>
                      <td>${data.city}</td>
                      <td>${data.country}</td>
                      <td>${data.weather}</td>
                      <td>${data.time}</td>
                      <td>${data.longitude}</td>
                      <td>${data.latitude}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Error in sendWeatherReport API: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
