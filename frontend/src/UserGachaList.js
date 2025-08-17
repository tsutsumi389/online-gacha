import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Grid, TextField, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const mockGachas = [
	{
		id: 1,
		name: 'ガチャA',
		price: 300,
		rates: 'SSR:5%, SR:15%, R:80%',
		images: [
			'https://placehold.jp/300x180.png?text=GachaA-1',
			'https://placehold.jp/300x180.png?text=GachaA-2',
		],
	},
	{
		id: 2,
		name: 'ガチャB',
		price: 500,
		rates: 'SSR:2%, SR:18%, R:80%',
		images: [
			'https://placehold.jp/300x180.png?text=GachaB-1',
			'https://placehold.jp/300x180.png?text=GachaB-2',
			'https://placehold.jp/300x180.png?text=GachaB-3',
		],
	},
];

export default function UserGachaList() {
	const [search, setSearch] = React.useState('');
	const filtered = mockGachas.filter((g) => g.name.includes(search));

	return (
		<Box sx={{ maxWidth: 900, mx: 'auto', my: 4, fontFamily: 'sans-serif' }}>
			<Typography variant="h4" sx={{ mb: 3 }}>
				ガチャ一覧
			</Typography>
			<Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
				<TextField
					label="ガチャ名で検索"
					size="small"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<Button variant="contained" startIcon={<SearchIcon />}>
					検索
				</Button>
			</Box>
			<Grid container spacing={3}>
				{filtered.map((gacha) => (
					<Grid item xs={12} sm={6} md={4} key={gacha.id}>
						<Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
							<Box sx={{ p: 2 }}>
								<Swiper
									modules={[Navigation, Pagination, A11y]}
									navigation
									pagination={{ clickable: true }}
									spaceBetween={8}
									slidesPerView={1}
									style={{ borderRadius: 8 }}
								>
									{gacha.images.map((img, idx) => (
										<SwiperSlide key={idx}>
											<img
												src={img}
												alt={gacha.name + '-' + (idx + 1)}
												style={{
													width: '100%',
													height: 180,
													objectFit: 'cover',
													borderRadius: 8,
												}}
											/>
										</SwiperSlide>
									))}
								</Swiper>
							</Box>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									{gacha.name}
								</Typography>
								<Typography color="text.secondary">価格: {gacha.price}pt</Typography>
								<Typography color="text.secondary" sx={{ mb: 1 }}>
									提供割合: {gacha.rates}
								</Typography>
							</CardContent>
							<CardActions sx={{ mt: 'auto' }}>
								<Button size="small" variant="outlined">
									詳細
								</Button>
								<Button size="small" variant="contained">
									引く
								</Button>
							</CardActions>
						</Card>
					</Grid>
				))}
			</Grid>
		</Box>
	);
}
