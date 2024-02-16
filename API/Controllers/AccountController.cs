using API.Data;
using API.DTO;
using API.Entities;
using API.Extensions;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    public class AccountController : BaseApiController
    {
        private readonly UserManager<User> _userManager;
        private readonly TokenService _tokenService;
        private readonly StoreContext _context;
        public AccountController(UserManager<User> userManager, TokenService tokenService, StoreContext context)
        {
            _context = context;
            _userManager = userManager;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<AccountDto>> Login(LoginDto loginDto)
        {
            var user = await _userManager.FindByEmailAsync(loginDto.Email);

            if (user == null || !await _userManager.CheckPasswordAsync(user, loginDto.Password))
                return Unauthorized();

            user = await _context.Users
                .Include(user => user.Sites)
                .Include(user => user.Shifts)
                .Include(user => user.Groups)
                .FirstOrDefaultAsync(user => user.Email == loginDto.Email);

            var token = await _tokenService.GenerateUserToken(user);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            return new AccountDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                Surname = user.Surname,
                Token = token,
                IsAdmin = isAdmin,
                Sites = user.Sites.Select(site => site.MapSiteToDto()).ToList(),
                DefaultSite = user.DefaultSite,
                Groups = user.Groups.Select(group => group.MapGroupToDto()).ToList(),
                DefaultGroup = user.DefaultGroup,
                Shifts = user.Shifts.Select(shift => shift.MapShiftToDto()).ToList()
            };
        }

        [HttpPost("register")]
        public async Task<ActionResult> Register(RegisterDto registerDto)
        {
            var user = new User { UserName = registerDto.Email, Email = registerDto.Email };

            var result = await _userManager.CreateAsync(user, registerDto.Password);

            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }

                return ValidationProblem();
            }

            await _userManager.AddToRoleAsync(user, "Member");

            return StatusCode(201);
        }

        [HttpPost("setPassword")]
        public async Task<ActionResult<AccountDto>> SetPassword(SetPasswordDto setPasswordDto)
        {
            var validatedToken = _tokenService.ValidateToken(setPasswordDto.Token);
            var userEmail = validatedToken.Claims.First(c => c.Type.Equals("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")).Value;

            var user = await _context.Users.FirstOrDefaultAsync(user => user.Email == userEmail);

            if (user == null) return BadRequest();

            var result = await _userManager.AddPasswordAsync(user, setPasswordDto.Password);

            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }

                return ValidationProblem();
            }

            return await Login(new LoginDto { Email = user.Email, Password = setPasswordDto.Password });
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult> AddUser(AddUserDto newUser)
        {
            var site = await _context.Sites.FindAsync(newUser.SiteId);
            if (site == null) return BadRequest(new ProblemDetails { Title = "Invalid site" });

            var group = await _context.Groups.FindAsync(newUser.GroupId);
            if (group == null) return BadRequest(new ProblemDetails { Title = "Invalid group" });

            var user = new User
            {
                FirstName = newUser.FirstName.FirstCharToUpper(),
                Surname = newUser.Surname.FirstCharToUpper(),
                Email = newUser.Email,
                UserName = newUser.Email,
                Sites = new List<Site>() { site },
                DefaultSite = site.Id,
                Groups = new List<Group>() { group },
            };

            var result = await _userManager.CreateAsync(user);

            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }

                return ValidationProblem();
            }

            await _userManager.AddToRoleAsync(user, "Member");

            if (newUser.IsAdmin) await _userManager.AddToRoleAsync(user, "Admin");

            var email = new Email
            {
                Id = Guid.NewGuid().ToString(),
                From = "no-reply@inntrac.com",
                To = newUser.Email,
                Template = "Welcome",
                Subject = "Welcome to Inntrac",
                Status = 0,
                CreatedAt = DateTime.UtcNow,
            };

            _context.Emails.Add(email);
            await _context.SaveChangesAsync();

            return StatusCode(201);

            // // Get the location header
            // var locationHeader = new Uri(Url.Link("GetUserById", new { id = user.Id }));

            // // Return the result
            // return Created(locationHeader, user);
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<AccountDto>> GetCurrentUser()
        {
            var user = await _context.Users
                .Include(user => user.Sites)
                .Include(user => user.Shifts)
                .Include(user => user.Groups)
                .FirstOrDefaultAsync(user => user.UserName == User.Identity.Name);

            var token = await _tokenService.GenerateUserToken(user);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            return new AccountDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                Surname = user.Surname,
                Token = token,
                IsAdmin = isAdmin,
                Sites = user.Sites.Select(site => site.MapSiteToDto()).ToList(),
                DefaultSite = user.DefaultSite,
                Groups = user.Groups.Select(group => group.MapGroupToDto()).ToList(),
                DefaultGroup = user.DefaultGroup,
                Shifts = user.Shifts.Select(shift => shift.MapShiftToDto()).ToList()
            }; ;
        }
    }
}