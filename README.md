# HiTrang





git pull
docker build -t hitrang-app:latest ./backend
docker compose up -d


ssh -i "/Users/thanhtung/Downloads/key-pair/tung-ec2.pem" -L 3306:127.0.0.1:3306 ec2-user@52.77.72.207
