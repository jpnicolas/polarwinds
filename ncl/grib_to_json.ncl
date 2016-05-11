; Load AMPS data
dir   = "../data/weather/"
fname = "2016050812_WRF_d2_f024.grb"
f     = addfile(dir+fname,"r")

; Dimensions
dims = getfilevardimsizes(f, "g5_lat_0")
imin = 5
imax = dims(0) - 6
jmin = 5
jmax = dims(1) - 6
nx   = imax - imin + 1
ny   = jmax - jmin + 1

; Variables
lat = f->g5_lat_0(imin:imax, jmin:jmax)
lon = f->g5_lon_1(imin:imax, jmin:jmax)
u10 = f->U_GRD_GDS5_HTGL(imin:imax, jmin:jmax)
v10 = f->V_GRD_GDS5_HTGL(imin:imax, jmin:jmax)

wspd = sqrt(u10^2 + v10^2)
maxSpeed = max(wspd)
delete(wspd)

u10 := toshort(round(100. * u10, 3))
v10 := toshort(round(100. * v10, 3))

fout = "uv10.nc"
system("rm -f "+dir+fout)
ncdf = addfile(dir+fout,"c")
ncdf->gridWidth = nx
ncdf->gridHeight = ny
ncdf->maxSpeed = maxSpeed
ncdf->u10 = u10
ncdf->v10 = v10
ncdf->lat = lat
ncdf->lon = lon
delete([/u10, v10, lat, lon/])

json = str_sub_str(fout, ".nc", ".json")
js   = str_sub_str(fout, ".nc", ".js")
system("ncdump-json -j " + dir + fout + " > " + dir + json)
datajson = asciiread(dir + json, 1, "string")
datajs = "windData = " + datajson
asciiwrite(dir+js, datajs)
delete([/datajson, datajs/])

system("rm -f " + dir + "*.{nc,json}")
