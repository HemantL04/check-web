require 'selenium-webdriver'
require 'yaml'
require 'sinatra/base'
require File.join(File.expand_path(File.dirname(__FILE__)), 'app_spec_helpers')

# A webserver for the web app

class Web < Sinatra::Base
  set :port, 3333
  set :public_folder, '../build/web'
  get '/*' do
    File.read('../build/web/index.html')
  end
end

describe 'app' do

  @driver = @config = @email = nil

  # Helpers

  include AppSpecHelpers

  # Start a webserver for the web app before the tests
  
  before :all do
    @web = Thread.new { Web.run! } if port_open?(3333)
    @email = 'sysops+' + Time.now.to_i.to_s + '@meedan.com'
    @config = YAML.load_file('config.yml')

    FileUtils.cp(@config['config_file_path'], '../build/web/js/config.js') unless @config['config_file_path'].nil?
  end

  # Close the testing webserver after all tests run

  after :all do
    FileUtils.cp('../config.js', '../build/web/js/config.js')
    begin
      Thread.kill(@web) unless @web.nil?
      puts
    rescue
      puts 'Could not kill the Sinatra server, please do it manually'
    end
  end

  # Start Google Chrome before each test

  before :each do
    Selenium::WebDriver::Chrome.driver_path = './chromedriver'
  
    if port_open?(9515)
      @driver = Selenium::WebDriver.for :chrome
    else
      @driver = Selenium::WebDriver.for :remote, url: 'http://localhost:9515'
    end
  end

  # Close Google Chrome after each test

  after :each do
    @driver.quit
  end

  # The tests themselves start here

  context "web" do
    it "should redirect to login screen if not logged in" do
      @driver.navigate.to 'http://localhost:3333/sources/'
      title = get_element('h2')
      expect(title.text == 'Sign up / Sign in').to be(true)
    end

    it "should login using Twitter and display user name on top right bar" do
      login_with_twitter
      displayed_name = get_element('#user-name span').text.upcase
      expected_name = @config['twitter_name'].upcase
      title = get_element('h2')
      expect(displayed_name == expected_name).to be(true)
      expect(title.text == 'Welcome to Checkdesk').to be(true)
    end

    it "should have footer" do
      @driver.navigate.to 'http://localhost:3333/'
      message = get_element('address')
      expect(message.text.include?(' v')).to be(true)
    end

    it "should redirect to 404 page" do
      login_with_twitter
      @driver.navigate.to 'http://localhost:3333/something-that-does-not-exist'
      title = get_element('h2')
      expect(title.text == 'Not Found').to be(true)
    end

    it "should click to go to homepage" do
      @driver.navigate.to 'http://localhost:3333/tos'
      @driver.find_element(:xpath, "//a[@id='link-home']").click
      expect(@driver.current_url.to_s == 'http://localhost:3333/').to be(true)
    end

    it "should click to go to Terms of Service" do
      login_with_twitter
      @driver.navigate.to 'http://localhost:3333/tos'
      title = get_element('h2')
      expect(title.text == 'Terms of Service').to be(true)
    end

    it "should register using e-mail" do
      @driver.navigate.to 'http://localhost:3333/'
      sleep 1
      @driver.find_element(:xpath, "//span[@id='login-email']").click
      sleep 1
      @driver.find_element(:xpath, "//button[@id='register-or-login']").click
      sleep 1
      fill_field('.login-name input', 'User With Email')
      fill_field('.login-email input', @email)
      fill_field('.login-password input', '12345678')
      fill_field('.login-password-confirmation input', '12345678')
      press_button('#submit-register-or-login')
      sleep 3
      displayed_name = get_element('#user-name span').text
      expect(displayed_name == 'USER WITH EMAIL').to be(true)
    end

    it "should login with e-mail" do
      login_with_email
      displayed_name = get_element('#user-name span').text
      expect(displayed_name == 'USER WITH EMAIL').to be(true)
    end

    it "should list sources" do
      login_with_email
      @driver.find_element(:xpath, "//a[@id='link-sources']").click
      expect(@driver.current_url.to_s == 'http://localhost:3333/sources').to be(true)
      title = get_element('h2')
      expect(title.text == 'Sources').to be(true)
    end

    it "should go to user page" do
      login_with_email
      @driver.find_element(:xpath, "//a[@id='link-me']").click
      expect(@driver.current_url.to_s == 'http://localhost:3333/me').to be(true)
      title = get_element('h2')
      expect(title.text == 'User With Email').to be(true)
    end

    it "should go to source page through source/:id" do
      login_with_email
      @driver.navigate.to 'http://localhost:3333/me'
      sleep 1
      source_id = @driver.find_element(:css, '.source').attribute('data-id')
      @driver.navigate.to 'http://localhost:3333/source/' + source_id.to_s
      sleep 1
      title = get_element('h2')
      expect(title.text == 'User With Email').to be(true)
    end

    it "should go to source page through user/:id" do
      login_with_email
      @driver.navigate.to 'http://localhost:3333/me'
      sleep 1
      user_id = @driver.find_element(:css, '.source').attribute('data-user-id')
      @driver.navigate.to 'http://localhost:3333/user/' + user_id.to_s
      sleep 1
      title = get_element('h2')
      expect(title.text == 'User With Email').to be(true)
    end
    
    it "should go back and forward in the history" do
      @driver.navigate.to 'http://localhost:3333/'
      expect(@driver.current_url.to_s == 'http://localhost:3333/').to be(true)
      @driver.navigate.to 'http://localhost:3333/tos'
      expect(@driver.current_url.to_s == 'http://localhost:3333/tos').to be(true)
      @driver.navigate.back
      expect(@driver.current_url.to_s == 'http://localhost:3333/').to be(true)
      @driver.navigate.forward
      expect(@driver.current_url.to_s == 'http://localhost:3333/tos').to be(true)
    end

    it "should login using Facebook and display user name on top right bar" do
      login_with_facebook
      displayed_name = get_element('#user-name span').text.upcase
      expected_name = @config['facebook_name'].upcase
      title = get_element('h2')
      expect(displayed_name == expected_name).to be(true)
      expect(title.text == 'Welcome to Checkdesk').to be(true)
    end

    it "should tag source from tags list" do
      login_with_email
      @driver.navigate.to 'http://localhost:3333/me'
      sleep 1

      # First, verify that there isn't any tag
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "selenium"')).to be(false)

      # Add a tag from tags list
      fill_field('.ReactTags__tagInput input', 'selenium')
      @driver.action.send_keys(:enter).perform
      sleep 5

      # Verify that tag was added to tags list and annotations list
      tag = get_element('.ReactTags__tag span')
      expect(tag.text == 'selenium').to be(true)
      expect(@driver.page_source.include?('Tagged as "selenium"')).to be(true)

      # Reload the page and verify that tags are still there
      @driver.navigate.refresh
      tag = get_element('.ReactTags__tag span')
      expect(tag.text == 'selenium').to be(true)
      expect(@driver.page_source.include?('Tagged as "selenium"')).to be(true)

      # Remove a tag from tags list
      @driver.find_element(:css, '.ReactTags__remove').click
      sleep 3

      # Verify that tag was removed from tags list and annotations list
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "selenium"')).to be(false)

      # Reload the page and verify that tags are not there anymore
      @driver.navigate.refresh
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "selenium"')).to be(false)
    end

    it "should tag source as a command" do
      login_with_email
      @driver.navigate.to 'http://localhost:3333/me'
      sleep 1

      # First, verify that there isn't any tag
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "command"')).to be(false)

      # Add a tag as a command
      fill_field('.cmd-input input', '/tag command')
      @driver.action.send_keys(:enter).perform
      sleep 5

      # Verify that tag was added to tags list and annotations list
      tag = get_element('.ReactTags__tag span')
      expect(tag.text == 'command').to be(true)
      expect(@driver.page_source.include?('Tagged as "command"')).to be(true)

      # Reload the page and verify that tags are still there
      @driver.navigate.refresh
      tag = get_element('.ReactTags__tag span')
      expect(tag.text == 'command').to be(true)
      expect(@driver.page_source.include?('Tagged as "command"')).to be(true)

      # Remove a tag from annotation list
      @driver.find_element(:css, '.delete-annotation').click
      sleep 3

      # Verify that tag was removed from tags list and annotations list
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "command"')).to be(false)

      # Reload the page and verify that tags are not there anymore
      @driver.navigate.refresh
      expect(@driver.find_elements(:css, '.ReactTags__tag').empty?).to be(true)
      expect(@driver.page_source.include?('Tagged as "command"')).to be(false)
    end

    it "should comment source as a command" do
      login_with_email
      @driver.navigate.to 'http://localhost:3333/me'
      sleep 1

      # First, verify that there isn't any comment
      expect(@driver.page_source.include?('This is my comment')).to be(false)

      # Add a comment as a command
      fill_field('.cmd-input input', '/comment This is my comment')
      @driver.action.send_keys(:enter).perform
      sleep 5

      # Verify that comment was added to annotations list
      expect(@driver.page_source.include?('This is my comment')).to be(true)

      # Reload the page and verify that comment is still there
      expect(@driver.page_source.include?('This is my comment')).to be(true)

      # Remove a comment from annotation list
      @driver.find_element(:css, '.delete-annotation').click
      sleep 3

      # Verify that comment was removed from annotations list
      expect(@driver.page_source.include?('This is my comment')).to be(false)

      # Reload the page and verify that comment is not there anymore
      @driver.navigate.refresh
      expect(@driver.page_source.include?('This is my comment')).to be(false)
    end
  end
end
